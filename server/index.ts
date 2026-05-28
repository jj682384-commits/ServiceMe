import express from "express";
import type { Request, Response, NextFunction } from "express";
import helmet from "helmet";
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
  // Only pass email to Stripe if it looks like a real email address
  const validEmail = email && email.includes("@") ? email : undefined;
  const customer = await stripe.customers.create({ email: validEmail, name, metadata: { userId } });
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

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,  // Expo web assets need cross-origin access
  contentSecurityPolicy: false,       // Expo web manages its own CSP
}));

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

    // Always allow the production domain
    origins.add("https://resqride.co");
    origins.add("https://www.resqride.co");
    if (process.env.EXPO_PUBLIC_DOMAIN) {
      origins.add(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
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
      limit: "2mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false, limit: "2mb" }));
}

/** Remove sensitive values from any object before logging. */
function scrubSensitive(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitive);
  const SENSITIVE = new Set(["password", "token", "password_hash", "authorization", "secret", "cvv", "ssn", "accesstoken", "refreshtoken"]);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = SENSITIVE.has(k.toLowerCase()) ? "[REDACTED]" : scrubSensitive(v);
  }
  return result;
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
        logLine += ` :: ${JSON.stringify(scrubSensitive(capturedJsonResponse))}`;
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

async function serveExpoManifest(platform: string, req: Request, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    try {
      const metroRes = await fetch("http://localhost:8081/", {
        headers: {
          "expo-platform": platform,
          "accept": "application/json",
        },
      });
      const body = await metroRes.text();
      // Determine the public-facing host from the incoming request
      const publicDomain = req.header("x-forwarded-host") || req.header("host") || "";
      let finalBody = body;
      if (publicDomain) {
        try {
          const manifest = JSON.parse(body);
          if (manifest.launchAsset?.url) {
            const origUrl = new URL(manifest.launchAsset.url);
            manifest.launchAsset.url = `https://${publicDomain}${origUrl.pathname}${origUrl.search}`;
          }
          if (manifest.extra?.expoGo?.debuggerHost) {
            manifest.extra.expoGo.debuggerHost = publicDomain;
          }
          if (manifest.extra?.expoClient?.hostUri) {
            manifest.extra.expoClient.hostUri = publicDomain;
          }
          finalBody = JSON.stringify(manifest);
        } catch {
          // leave body as-is if JSON parse fails
        }
      }
      res.setHeader("expo-protocol-version", "1");
      res.setHeader("expo-sfv-version", "0");
      res.setHeader("content-type", "application/json");
      return res.send(finalBody);
    } catch {
      return res
        .status(503)
        .json({ error: "Metro bundler unavailable. Start the dev server." });
    }
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
      serveExpoManifest(platform, req, res).catch(next);
      return;
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
  // ── Redirect old Replit domain to custom domain ───────────────────────────
  app.use((req: Request, res: Response, next: NextFunction) => {
    const host = req.header("x-forwarded-host") || req.header("host") || "";
    const OLD_DOMAIN = "roadside-relay--sjx89tprxq.replit.app";
    if (host === OLD_DOMAIN) {
      return res.redirect(301, `https://resqride.co${req.originalUrl}`);
    }
    next();
  });

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

  // ── Legal pages (publicly accessible for App Store review) ───────────────
  function buildLegalHtml(title: string, lastUpdated: string, sections: Array<{ heading: string; content: string }>): string {
    const sectionsHtml = sections.map(s => `
      <section>
        <h2>${s.heading}</h2>
        <p>${s.content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p>
      </section>`).join("\n");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ResqRide</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#04060E;color:#e0e0e0;line-height:1.7;padding:0 16px 60px}
    header{background:#04060E;border-bottom:1px solid #1a1f2e;padding:20px 0;margin-bottom:40px;position:sticky;top:0}
    .inner{max-width:760px;margin:0 auto}
    .logo{display:flex;align-items:center;gap:10px}
    .logo-name{font-size:20px;font-weight:700;color:#fff}
    .logo-name span{color:#0066FF}
    h1{font-size:28px;font-weight:700;color:#fff;margin-bottom:8px}
    .meta{font-size:13px;color:#6b7280;margin-bottom:40px}
    section{margin-bottom:36px}
    h2{font-size:16px;font-weight:600;color:#fff;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #1a1f2e}
    p{font-size:15px;color:#b0b8c8;line-height:1.8}
    footer{border-top:1px solid #1a1f2e;padding-top:24px;margin-top:40px;font-size:13px;color:#4b5563;text-align:center}
    a{color:#0066FF;text-decoration:none}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <header>
    <div class="inner">
      <div class="logo">
        <div class="logo-name">Resq<span>Ride</span></div>
      </div>
    </div>
  </header>
  <div class="inner">
    <h1>${title}</h1>
    <p class="meta">Last updated: ${lastUpdated}</p>
    ${sectionsHtml}
    <footer>
      <p>&copy; ${new Date().getFullYear()} ResqRide Inc. &nbsp;·&nbsp;
        <a href="/privacy">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="/terms">Terms of Service</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
  }

  const LEGAL_LAST_UPDATED = "February 19, 2026";

  const PRIVACY_SECTIONS = [
    { heading: "Introduction", content: `ResqRide ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").\n\nBy using ResqRide, you agree to the collection and use of information in accordance with this policy.` },
    { heading: "Information We Collect", content: `We collect several types of information:\n\nPersonal Information:\n- Name, email address, and phone number\n- Profile photo (optional)\n- Payment and billing information\n- Vehicle information (make, model, year, license plate)\n\nLocation Data:\n- Real-time GPS location when you request roadside assistance\n- Location is shared with service providers to facilitate service delivery\n- Location tracking ends after your service request is completed\n\nDevice Information:\n- Device type, operating system, and unique device identifiers\n- Mobile network information\n- App usage statistics and crash reports` },
    { heading: "How We Use Your Information", content: `We use the collected information to:\n- Connect you with nearby roadside assistance providers\n- Process and fulfill your service requests\n- Calculate accurate arrival times and distances\n- Facilitate communication between you and service providers\n- Process payments and manage billing\n- Prevent fraudulent transactions\n- Analyze usage patterns and improve our app\n- Send service updates and notifications` },
    { heading: "Information Sharing", content: `We may share your information in the following situations:\n\nWith Service Providers:\n- Your location and contact information are shared with assigned service providers to complete your request\n\nThird-Party Service Providers:\n- Payment processors (Stripe)\n- Analytics providers\n- Cloud storage providers\n- Map services (Google Maps)\n\nLegal Requirements:\n- When required by law or legal process\n- To protect our rights, privacy, safety, or property` },
    { heading: "Data Security", content: `We implement appropriate technical and organizational security measures:\n- Encryption of data in transit and at rest\n- Secure authentication mechanisms\n- Regular security assessments and updates\n- Access controls limiting data access to authorized personnel\n\nNo method of transmission over the Internet is 100% secure. While we strive to use commercially acceptable means to protect your data, we cannot guarantee its absolute security.` },
    { heading: "Data Retention", content: `We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements.\n\nService request history is retained for up to 3 years for quality assurance and dispute resolution purposes. You may request deletion of your account and associated data at any time.` },
    { heading: "Your Rights", content: `Depending on your location, you may have certain rights regarding your personal information:\n\nAccess: Request a copy of the personal information we hold about you\nCorrection: Request correction of inaccurate or incomplete information\nDeletion: Request deletion of your personal information\nPortability: Request a copy of your data in a portable format\nOpt-Out: Opt out of marketing communications at any time\n\nTo exercise these rights, please contact us at privacy@resqride.app` },
    { heading: "Children's Privacy", content: `Our Service is not intended for use by children under the age of 18. We do not knowingly collect personal information from children under 18. If you believe your child has provided us with personal information, please contact us immediately.` },
    { heading: "Changes to This Policy", content: `We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Significant changes will also be communicated via email.` },
    { heading: "Contact Us", content: `If you have any questions about this Privacy Policy, please contact us:\n\nEmail: privacy@resqride.app\nAddress: ResqRide Inc., 123 Roadside Way, San Francisco, CA 94102, United States\n\nFor data protection inquiries in the EU, contact our Data Protection Officer at dpo@resqride.app` },
  ];

  const TERMS_SECTIONS = [
    { heading: "Agreement to Terms", content: `Welcome to ResqRide. These Terms of Service ("Terms") govern your access to and use of the ResqRide mobile application and related services operated by ResqRide Inc.\n\nBy accessing or using our Service, you agree to be bound by these Terms. You must be at least 18 years old to use this Service.` },
    { heading: "Description of Service", content: `ResqRide is an on-demand roadside assistance platform that connects drivers in need of help with nearby service providers. Our services include flat tire assistance, jump starts, towing, fuel delivery, and lockout assistance.\n\nResqRide acts as a platform connecting users with independent service providers. We do not directly provide roadside assistance services. Service providers are independent contractors, not employees of ResqRide.` },
    { heading: "User Accounts", content: `To use certain features of the Service, you must create an account. When you create an account, you agree to:\n- Provide accurate, current, and complete information\n- Maintain the security of your password and account\n- Accept responsibility for all activities that occur under your account\n- Notify us immediately of any unauthorized use of your account` },
    { heading: "User Responsibilities", content: `As a user of ResqRide, you agree to use the Service only for lawful purposes, provide accurate information about your location and vehicle, be present when a service provider arrives, treat service providers with respect, and pay all applicable fees.\n\nYou agree NOT to submit false or misleading service requests, harass or abuse service providers, or interfere with the proper working of the Service.` },
    { heading: "Pricing and Payment", content: `Service prices are displayed before you confirm a request. Payment is processed after service completion. We accept major credit cards and digital payment methods. All fees are non-refundable except as stated in our Refund Policy.\n\nPremium members receive discounted rates and priority service. Membership fees are billed monthly and auto-renew. You may cancel your membership at any time.` },
    { heading: "Cancellation and Refund Policy", content: `You may cancel a service request before a provider is assigned at no charge. Cancellation after provider assignment may result in a cancellation fee.\n\nIf a provider cancels, we will attempt to find an alternative. If no alternative is available, you will receive a full refund. Refund requests must be submitted within 48 hours of service and are processed within 5-10 business days.` },
    { heading: "Limitation of Liability", content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ResqRide provides the Service on an "AS IS" and "AS AVAILABLE" basis. We make no warranties regarding the reliability or availability of the Service.\n\nIN NO EVENT SHALL RESQRIDE BE LIABLE FOR any indirect, incidental, special, or consequential damages. Our total liability shall not exceed the amount paid for services in the past 12 months.` },
    { heading: "Dispute Resolution", content: `Before filing any legal claim, you agree to attempt to resolve disputes informally by contacting us at legal@resqride.app.\n\nAny disputes not resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in San Francisco, California. You waive any right to participate in a class action lawsuit.` },
    { heading: "Governing Law", content: `These Terms shall be governed by the laws of the State of California, without regard to its conflict of law provisions.` },
    { heading: "Changes to Terms", content: `We reserve the right to modify or replace these Terms at any time. Material changes will be communicated through in-app notifications and email. Your continued use of the Service after changes constitutes acceptance of the new Terms.` },
    { heading: "Contact Information", content: `If you have any questions about these Terms, please contact us:\n\nEmail: legal@resqride.app\nAddress: ResqRide Inc., 123 Roadside Way, San Francisco, CA 94102, United States\nPhone: 1-800-SERVICE (1-800-737-8423)\nHours: 24/7 Support Available` },
  ];

  app.get("/privacy", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildLegalHtml("Privacy Policy", LEGAL_LAST_UPDATED, PRIVACY_SECTIONS));
  });

  app.get("/terms", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(buildLegalHtml("Terms of Service", LEGAL_LAST_UPDATED, TERMS_SECTIONS));
  });

  // ── Metro bundle proxy — lets Expo Go download the live JS bundle via the public domain ──
  app.get(["/client/index.bundle", "/index.bundle", "/:any/index.bundle"], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const qs = Object.entries(req.query as Record<string, string>).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
      const metroUrl = `http://localhost:8081${req.path}${qs ? `?${qs}` : ""}`;
      log(`[METRO PROXY] ${metroUrl}`);
      const metroRes = await fetch(metroUrl);
      if (!metroRes.ok) return next();
      const ct = metroRes.headers.get("content-type") || "application/javascript";
      res.setHeader("content-type", ct);
      const buf = await metroRes.arrayBuffer();
      res.send(Buffer.from(buf));
    } catch {
      next();
    }
  });

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
          platform: "resqride",
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
        const validEmail = user.email && user.email.includes("@") ? user.email : undefined;
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: validEmail,
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
    res.send("<html><body><h2>Payout setup complete — return to the ResqRide app.</h2></body></html>");
  });

  app.get("/api/stripe/connect/refresh", (req: Request, res: Response) => {
    res.send("<html><body><h2>Session expired — please re-open the payout setup from the ResqRide app.</h2></body></html>");
  });

  // ── Kill-SW routes (registered BEFORE configureExpoAndLanding) ───────────────
  // Serve a self-unregistering SW at every common Expo/web SW path so the
  // browser auto-updates the stale SW and removes it.
  const killSwPath = path.resolve(process.cwd(), "server", "kill-sw.js");
  const killSwHandler = (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.sendFile(killSwPath);
  };
  const swPaths = [
    "/expo-service-worker.js",
    "/service-worker.js",
    "/sw.js",
    "/ExpoServiceWorker.worker.js",
  ];
  swPaths.forEach((p) => app.get(p, killSwHandler));

  // /clear — manual SW reset page; also redirects to admin after clearing
  app.get("/clear", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Clear-Site-Data", '"cache", "storage"');
    res.send(`<!DOCTYPE html><html><head><title>Clearing…</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font-family:sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:16px}</style>
</head><body>
<p>Clearing browser cache…</p>
<script>
(async()=>{
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    const keys=await caches.keys();
    await Promise.all(keys.map(k=>caches.delete(k)));
  }catch(e){}
  window.location.replace('/rr-ops');
})();
</script>
<noscript><a href="/rr-ops" style="color:#0af">Go to Admin</a></noscript>
</body></html>`);
  });

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  // Immediate shutdown — release the port instantly so restarts never hit EADDRINUSE
  const shutdown = () => {
    server.closeAllConnections?.();
    process.exit(0);
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const port = parseInt(process.env.PORT || "5000", 10);

  // Gracefully handle EADDRINUSE: wait and retry rather than crashing
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${port} in use, retrying in 4s...`);
      setTimeout(() => server.listen(port, "0.0.0.0"), 4000);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

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
