import Stripe from "stripe";

let connectionSettings: any;

async function fetchConnection(environment: "production" | "development") {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!hostname || !xReplitToken) return null;

  try {
    const url = new URL(`https://${hostname}/api/v2/connection`);
    url.searchParams.set("include_secrets", "true");
    url.searchParams.set("connector_names", "stripe");
    url.searchParams.set("environment", environment);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    });

    const data = await response.json();
    const conn = data.items?.[0];
    if (conn?.settings?.publishable && conn?.settings?.secret) {
      return { publishableKey: conn.settings.publishable as string, secretKey: conn.settings.secret as string };
    }
  } catch {
    // ignore — will try next fallback
  }
  return null;
}

async function getCredentials() {
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";

  // 1. Try the environment-matched Replit integration connection
  const primary = await fetchConnection(isProduction ? "production" : "development");
  if (primary) return primary;

  // 2. Fall back to the other environment's connection (e.g. dev keys in prod deployment)
  const fallback = await fetchConnection(isProduction ? "development" : "production");
  if (fallback) return fallback;

  // 3. Fall back to plain environment variables (STRIPE_SECRET_KEY / STRIPE_PUBLISHABLE_KEY)
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (secretKey && publishableKey) {
    return { secretKey, publishableKey };
  }

  throw new Error("Stripe not configured — no connection or env vars found");
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
