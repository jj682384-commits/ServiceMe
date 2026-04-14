import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";
import { WebhookHandlers } from "./webhookHandlers";
import { getStripeSync, getStripePublishableKey, getUncachableStripeClient } from "./stripeClient";
import { runMigrations } from "stripe-replit-sync";
import { pool } from "./db";
import { getUserByToken, extractToken } from "./auth";

// ── Stripe helpers (index-level) ─────────────────────────────────────────────

async function ensureStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const { rows } = await pool.query<{ stripe_customer_id: string }>(
    "SELECT stripe_customer_id FROM auth_users WHERE id = $1", [userId]
  );
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  await pool.query("UPDATE auth_users SET stripe_customer_id = $2 WHERE id = $1", [userId, customer.id]);
  return customer.id;
}

async function requireUser(req: Request, res: Response): Promise<{ id: string; email: string; name: string } | null> {
  const token = extractToken(req.headers["authorization"]);
  if (!token) { res.status(401).json({ error: "No token" }); return null; }
  const user = await getUserByToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return null; }
  return user;
}

const app = express();
app.disable("etag");
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    if (origin && origins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  const host = forwardedHost || replitDomain || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    log(`[REQ] ${req.method} ${req.path} expo-platform=${req.header("expo-platform") || "none"} ua=${(req.header("user-agent") || "").substring(0, 60)}`);

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      log(`[MANIFEST] Serving ${platform} manifest`);
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    res.status(status).json({ message });
  });
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

(async () => {
  setupCors(app);

  // ── Stripe webhook — must come BEFORE express.json() ─────────────────────
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const signature = req.headers["stripe-signature"];
      if (!signature) return res.status(400).json({ error: "Missing stripe-signature" });
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (err: any) {
        console.error("[stripe/webhook]", err.message);
        res.status(400).json({ error: "Webhook error" });
      }
    }
  );

  setupBodyParsing(app);
  setupRequestLogging(app);

  // ── Stripe publishable key endpoint ───────────────────────────────────────
  app.get("/api/stripe/publishable-key", async (_req: Request, res: Response) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (err: any) {
      console.error("[stripe/publishable-key]", err.message);
      res.status(500).json({ error: "Stripe not configured" });
    }
  });

  // ── Create PaymentIntent for a service request ────────────────────────────
  app.post("/api/create-payment-intent", async (req: Request, res: Response) => {
    try {
      const { amount, jobId, serviceType } = req.body as {
        amount: number;
        jobId?: string;
        serviceType?: string;
      };
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount required" });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        metadata: {
          jobId: jobId || "",
          serviceType: serviceType || "",
          platform: "serviceme",
        },
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
      console.error("[stripe/create-payment-intent]", err.message);
      res.status(500).json({ error: "Could not create payment intent" });
    }
  });

  // ── Stripe SetupIntent (save card) ──────────────────────────────────────────
  app.post("/api/stripe/setup-intent", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const stripe = await getUncachableStripeClient();
      const customerId = await ensureStripeCustomer(user.id, user.email, user.name);
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });
      res.json({ clientSecret: setupIntent.client_secret, customerId });
    } catch (err: any) {
      console.error("[stripe/setup-intent]", err.message);
      res.status(500).json({ error: "Could not create setup intent" });
    }
  });

  app.post("/api/stripe/ephemeral-key", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const { apiVersion } = req.body as { apiVersion?: string };
      const stripe = await getUncachableStripeClient();
      const customerId = await ensureStripeCustomer(user.id, user.email, user.name);
      const ephemeralKey = await stripe.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: apiVersion || "2024-04-10" }
      );
      res.json({ ephemeralKey: ephemeralKey.secret, customerId });
    } catch (err: any) {
      console.error("[stripe/ephemeral-key]", err.message);
      res.status(500).json({ error: "Could not create ephemeral key" });
    }
  });

  // ── Payment Methods (list & remove) ─────────────────────────────────────────
  app.get("/api/stripe/payment-methods", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const { rows } = await pool.query<{ stripe_customer_id: string }>(
        "SELECT stripe_customer_id FROM auth_users WHERE id = $1", [user.id]
      );
      if (!rows[0]?.stripe_customer_id) return res.json({ paymentMethods: [] });
      const stripe = await getUncachableStripeClient();
      const list = await stripe.paymentMethods.list({
        customer: rows[0].stripe_customer_id,
        type: "card",
      });
      res.json({ paymentMethods: list.data });
    } catch (err: any) {
      console.error("[stripe/payment-methods]", err.message);
      res.status(500).json({ error: "Could not fetch payment methods" });
    }
  });

  app.delete("/api/stripe/payment-methods/:pmId", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const stripe = await getUncachableStripeClient();
      await stripe.paymentMethods.detach(req.params.pmId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[stripe/payment-methods/detach]", err.message);
      res.status(500).json({ error: "Could not remove payment method" });
    }
  });

  app.post("/api/stripe/payment-methods/set-default", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const { paymentMethodId } = req.body as { paymentMethodId: string };
      const { rows } = await pool.query<{ stripe_customer_id: string }>(
        "SELECT stripe_customer_id FROM auth_users WHERE id = $1", [user.id]
      );
      if (!rows[0]?.stripe_customer_id) return res.status(400).json({ error: "No Stripe customer" });
      const stripe = await getUncachableStripeClient();
      await stripe.customers.update(rows[0].stripe_customer_id, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[stripe/set-default]", err.message);
      res.status(500).json({ error: "Could not set default" });
    }
  });

  // ── Stripe Connect (provider payouts) ────────────────────────────────────────
  app.post("/api/stripe/connect/onboard", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const { providerId } = req.body as { providerId: string };
      if (!providerId) return res.status(400).json({ error: "providerId required" });

      const stripe = await getUncachableStripeClient();

      // Check if provider already has a Connect account
      const { rows } = await pool.query<{ stripe_account_id: string }>(
        "SELECT stripe_account_id FROM providers WHERE id = $1", [providerId]
      );
      let accountId = rows[0]?.stripe_account_id;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: user.email,
          capabilities: { transfers: { requested: true } },
          metadata: { providerId, userId: user.id },
        });
        accountId = account.id;
        await pool.query(
          "UPDATE providers SET stripe_account_id = $2 WHERE id = $1",
          [providerId, accountId]
        );
      }

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
      const baseUrl = domain ? `https://${domain}` : "https://localhost:5000";
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${baseUrl}/api/stripe/connect/refresh?providerId=${providerId}`,
        return_url: `${baseUrl}/api/stripe/connect/return?providerId=${providerId}`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url, accountId });
    } catch (err: any) {
      console.error("[stripe/connect/onboard]", err.message);
      res.status(500).json({ error: "Could not create Connect account" });
    }
  });

  app.get("/api/stripe/connect/status", async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, res);
      if (!user) return;
      const { providerId } = req.query as { providerId?: string };
      if (!providerId) return res.status(400).json({ error: "providerId required" });

      const { rows } = await pool.query<{ stripe_account_id: string }>(
        "SELECT stripe_account_id FROM providers WHERE id = $1", [providerId]
      );
      const accountId = rows[0]?.stripe_account_id;
      if (!accountId) return res.json({ connected: false, accountId: null });

      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(accountId);
      res.json({
        connected: account.charges_enabled && account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        accountId,
      });
    } catch (err: any) {
      console.error("[stripe/connect/status]", err.message);
      res.status(500).json({ error: "Could not get Connect status" });
    }
  });

  app.get("/api/stripe/connect/return", (_req: Request, res: Response) => {
    res.send("<html><body><h2>Payout setup complete — return to the ServiceMe app.</h2></body></html>");
  });

  app.get("/api/stripe/connect/refresh", (req: Request, res: Response) => {
    res.send("<html><body><h2>Session expired — please re-open the payout setup from the ServiceMe app.</h2></body></html>");
  });

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  // Graceful shutdown — release the port so restarts don't hit EADDRINUSE
  const shutdown = () => {
    server.closeAllConnections?.();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "0.0.0.0", async () => {
    log(`express server serving on port ${port}`);

    // Initialize Stripe schema and sync in the background
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl) {
        await runMigrations({ databaseUrl, schema: "stripe" });
        const stripeSync = await getStripeSync();
        const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ||
          process.env.REPLIT_DEV_DOMAIN;
        if (domain) {
          await stripeSync.findOrCreateManagedWebhook(
            `https://${domain}/api/stripe/webhook`
          );
        }
        stripeSync.syncBackfill().catch((err: any) =>
          console.error("[stripe] syncBackfill error:", err.message)
        );
        log("[stripe] initialized");
      }
    } catch (err: any) {
      console.error("[stripe] init error (non-fatal):", err.message);
    }
  });
})();
