import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { pool, rowToProvider, rowToJob, type ProviderRow, type JobRow } from "./db";
import { hashPassword, verifyPassword, createSession, getUserByToken, deleteSession, extractToken } from "./auth";
import { getUncachableStripeClient } from "./stripeClient";

// ── Types ────────────────────────────────────────────────────────────────────

interface ProviderBadge {
  type: string;
  label: string;
}

interface ProviderRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  reviewCount: number;
  vehicleType: "tow_truck" | "service_van" | "pickup";
  vehicleMake: string;
  vehicleModel: string;
  licensePlate: string;
  servicesOffered: string[];
  isAvailable: boolean;
  providerType: "shop" | "independent";
  verificationStatus: string;
  verificationDocuments?: Record<string, boolean>;
  verificationSubmittedAt?: string;
  verificationNotes?: string;
  badges?: ProviderBadge[];
  location: { latitude: number; longitude: number };
  lastLocationUpdate?: string;
  pushToken?: string;
  evCapable?: boolean;
  evServices?: string[];
  acceptsPriorityJobs?: boolean;
}

interface JobRecord {
  id: string;
  serviceType: string;
  location: { address: string; latitude: number; longitude: number };
  notes: string;
  status: "pending" | "accepted" | "cancelled";
  estimatedCost: number;
  driver?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  providerLocation?: { latitude: number; longitude: number };
  eta?: number;
  isExpress?: boolean;
  expressFee?: number;
  serviceFee?: number;
  totalCost?: number;
  tip?: number;
  driverRating?: number;
  receiptNumber?: string;
  timeSaved?: number;
  createdAt: string;
  scheduledDate?: string;
  isEmergency?: boolean;
  isEV?: boolean;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: "driver" | "provider" | null;
  content: string;
  timestamp: string;
}

interface WsClient {
  ws: WebSocket;
  conversationId: string;
  senderId: string;
  senderRole: "driver" | "provider" | null;
  isNotifier?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// ── Chat (in-memory — ephemeral real-time only) ───────────────────────────────

const messageHistory = new Map<string, ChatMessage[]>();
const clients = new Set<WsClient>();

const PROVIDER_REPLIES = [
  "I'm on my way, shouldn't be too long!",
  "Got it, I'll be there shortly.",
  "No problem, I'm heading your way now.",
  "Understood. Can you turn on your hazard lights so I can spot you easier?",
  "I can see your location. ETA is about 5 minutes.",
  "Thanks for the update. I'm pulling up now.",
  "Please stay with your vehicle — I'm almost there.",
  "Do you need anything else while I'm en route?",
];

const DRIVER_REPLIES = [
  "Thanks, I really appreciate the quick response!",
  "I'm parked on the right side of the road with hazards on.",
  "Got it. I'll be waiting here.",
  "Sounds good, thank you!",
  "I'm in a silver sedan, right next to the fire hydrant.",
  "Perfect, see you soon!",
];

function getAutoReply(senderRole: string): string {
  if (senderRole === "driver") {
    return PROVIDER_REPLIES[Math.floor(Math.random() * PROVIDER_REPLIES.length)];
  }
  return DRIVER_REPLIES[Math.floor(Math.random() * DRIVER_REPLIES.length)];
}

function broadcastToConversation(conversationId: string, payload: object, excludeClient?: WsClient) {
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.conversationId === conversationId && client !== excludeClient) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }
}

// ── Admin ─────────────────────────────────────────────────────────────────────

// ── Admin auth — HMAC-signed tokens (survive server restarts) ────────────────
// Token format: "<expiry_ms>.<hmac_hex>"
// Signed with SESSION_SECRET so no server-side state needed.
const ADMIN_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signAdminToken(): string {
  const secret = process.env.SESSION_SECRET || "fallback-secret";
  const expiry = (Date.now() + ADMIN_TOKEN_TTL_MS).toString();
  const mac = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
  return `${expiry}.${mac}`;
}

function verifyAdminToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expiry, mac] = parts;
  const secret = process.env.SESSION_SECRET || "fallback-secret";
  const expected = crypto.createHmac("sha256", secret).update(expiry).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(mac, "hex").slice(0, 32), Buffer.from(expected, "hex").slice(0, 32))) return false;
  return Date.now() < parseInt(expiry, 10);
}

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!verifyAdminToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ── SmartCar (in-memory — OAuth tokens, not user data) ───────────────────────

const smartcarTokenStore = new Map<string, {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  vehicleIds: string[];
}>();

async function smartcarRequest(url: string, accessToken: string) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "sc-unit-system": "imperial" },
  });
  if (!response.ok) throw new Error(`SmartCar API error: ${response.status}`);
  return response.json();
}

async function refreshSmartcarToken(userId: string): Promise<string | null> {
  const data = smartcarTokenStore.get(userId);
  if (!data) return null;
  if (Date.now() < data.expiresAt - 60000) return data.accessToken;
  try {
    const creds = Buffer.from(`${process.env.SMARTCAR_CLIENT_ID}:${process.env.SMARTCAR_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://auth.smartcar.com/oauth/token", {
      method: "POST",
      headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: data.refreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { access_token: string; refresh_token: string; expires_in: number };
    data.accessToken = json.access_token;
    data.refreshToken = json.refresh_token;
    data.expiresAt = Date.now() + json.expires_in * 1000;
    return data.accessToken;
  } catch {
    return null;
  }
}

// ── Push notification helper ─────────────────────────────────────────────────

function sendPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {},
  opts: { priority?: "normal" | "high"; channelId?: string } = {}
) {
  if (!tokens.length) return;
  const messages = tokens.map((to) => ({
    to, title, body, data,
    sound: "default",
    priority: opts.priority ?? "normal",
    channelId: opts.channelId ?? "default",
  }));
  fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(messages),
  }).catch((err) => console.error("[PUSH]", err));
}

async function getDriverPushToken(driverEmail: string): Promise<string | null> {
  const { rows } = await pool.query<{ push_token: string }>(
    "SELECT push_token FROM auth_users WHERE email = $1 AND push_token IS NOT NULL",
    [driverEmail]
  );
  return rows[0]?.push_token ?? null;
}

// ── Stripe customer helper ────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const { rows } = await pool.query<{ stripe_customer_id: string }>(
    "SELECT stripe_customer_id FROM auth_users WHERE id = $1",
    [userId]
  );
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;
  const stripe = await getUncachableStripeClient();
  const customer = await stripe.customers.create({ email, name, metadata: { userId } });
  await pool.query("UPDATE auth_users SET stripe_customer_id = $2 WHERE id = $1", [userId, customer.id]);
  return customer.id;
}

// ── DB broadcast helper ───────────────────────────────────────────────────────

let broadcastJobUpdate: (job: JobRecord) => void = () => {};

// ── Routes ────────────────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  // ── DB column migrations (idempotent) ────────────────────────────────────────
  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS accepts_priority_jobs BOOLEAN DEFAULT FALSE
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS payout_bank_info JSONB DEFAULT NULL
  `).catch(() => {});
  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS earnings_balance NUMERIC(10,2) DEFAULT 0
  `).catch(() => {});
  // ── Jobs table column migrations ──────────────────────────────────────────
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS express_fee NUMERIC DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS service_fee  NUMERIC DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS total_cost   NUMERIC DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tip          NUMERIC DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS receipt_number TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_date TIMESTAMPTZ DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_ev        BOOLEAN DEFAULT FALSE`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS provider_location JSONB DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS earnings_credited BOOLEAN DEFAULT FALSE`).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS provider_payouts (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      fee NUMERIC(10,2) NOT NULL DEFAULT 0,
      net_amount NUMERIC(10,2) NOT NULL,
      payout_type TEXT NOT NULL DEFAULT 'standard',
      status TEXT NOT NULL DEFAULT 'pending',
      bank_last4 TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  function getSmartcarRedirectUri(): string {
    const prodDomain = process.env.REPLIT_INTERNAL_APP_DOMAIN;
    if (prodDomain) return `https://${prodDomain}/api/smartcar/callback`;
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    if (devDomain) return `https://${devDomain}:5000/api/smartcar/callback`;
    return "http://localhost:5000/api/smartcar/callback";
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    const { email, name, phone, password, role } = req.body as {
      email: string; name: string; phone?: string; password: string; role?: string;
    };
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, name, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const userRole = role === "provider" ? "provider" : "driver";
    try {
      const existing = await pool.query("SELECT id FROM auth_users WHERE email = $1", [email.toLowerCase().trim()]);
      if (existing.rows.length) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }
      const userId = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const passwordHash = await hashPassword(password);
      await pool.query(
        "INSERT INTO auth_users (id, email, password_hash, name, phone, role) VALUES ($1, $2, $3, $4, $5, $6)",
        [userId, email.toLowerCase().trim(), passwordHash, name.trim(), (phone || "").trim(), userRole]
      );
      const token = await createSession(userId);
      console.log(`[AUTH] signup userId=${userId} email=${email} role=${userRole}`);
      res.status(201).json({ userId, token, role: userRole, name: name.trim(), email: email.toLowerCase().trim(), phone: (phone || "").trim() });
    } catch (err) {
      console.error("[auth/signup]", err);
      res.status(500).json({ error: "Could not create account" });
    }
  });

  app.post("/api/auth/signin", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    try {
      const { rows } = await pool.query<{ id: string; email: string; name: string; phone: string; role: string; password_hash: string }>(
        "SELECT id, email, name, phone, role, password_hash FROM auth_users WHERE email = $1",
        [email.toLowerCase().trim()]
      );
      if (!rows.length) {
        return res.status(401).json({ error: "Email or password is incorrect" });
      }
      const user = rows[0];
      const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Email or password is incorrect" });
      }
      const token = await createSession(user.id);
      console.log(`[AUTH] signin userId=${user.id} email=${email}`);
      res.json({ userId: user.id, token, role: user.role, name: user.name, email: user.email, phone: user.phone });
      // Silently upgrade legacy/slow password hash in the background — next login will be fast
      if (needsRehash) {
        hashPassword(password)
          .then((newHash) =>
            pool.query("UPDATE auth_users SET password_hash = $1 WHERE id = $2", [newHash, user.id])
          )
          .then(() => console.log(`[AUTH] rehashed password for userId=${user.id}`))
          .catch(() => {});
      }
    } catch (err) {
      console.error("[auth/signin]", err);
      res.status(500).json({ error: "Sign in failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Invalid or expired session" });
      res.json(user);
    } catch (err) {
      console.error("[auth/me]", err);
      res.status(500).json({ error: "Session check failed" });
    }
  });

  app.post("/api/auth/signout", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (token) {
      try { await deleteSession(token); } catch {}
    }
    res.json({ success: true });
  });

  app.patch("/api/auth/profile", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { name, phone, email } = req.body as { name?: string; phone?: string; email?: string };
      if (!name?.trim() && !phone?.trim() && !email?.trim()) {
        return res.status(400).json({ error: "Provide at least one field to update" });
      }
      await pool.query(
        `UPDATE auth_users SET
           name  = COALESCE(NULLIF($2,''), name),
           phone = COALESCE(NULLIF($3,''), phone),
           email = COALESCE(NULLIF($4,''), email),
           updated_at = NOW()
         WHERE id = $1`,
        [user.id, name?.trim() ?? "", phone?.trim() ?? "", email?.trim() ?? ""]
      );
      await pool.query(
        `UPDATE providers SET
           name  = COALESCE(NULLIF($2,''), name),
           phone = COALESCE(NULLIF($3,''), phone),
           email = COALESCE(NULLIF($4,''), email),
           updated_at = NOW()
         WHERE id = $1`,
        [user.id, name?.trim() ?? "", phone?.trim() ?? "", email?.trim() ?? ""]
      ).catch(() => {});
      const { rows } = await pool.query(
        "SELECT id, name, email, phone, role FROM auth_users WHERE id = $1",
        [user.id]
      );
      console.log(`[AUTH] profile updated userId=${user.id}`);
      res.json({ success: true, user: rows[0] });
    } catch (err) {
      console.error("[auth/profile]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/auth/role", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { role } = req.body as { role: string };
      if (role !== "driver" && role !== "provider") {
        return res.status(400).json({ error: "role must be 'driver' or 'provider'" });
      }
      await pool.query(
        "UPDATE auth_users SET role = $2, updated_at = NOW() WHERE id = $1",
        [user.id, role]
      );
      console.log(`[AUTH] role switched userId=${user.id} newRole=${role}`);
      res.json({ success: true, userId: user.id, role });
    } catch (err) {
      console.error("[auth/role]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/auth/push-token", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { pushToken } = req.body as { pushToken: string };
      await pool.query(
        "UPDATE auth_users SET push_token = $2, updated_at = NOW() WHERE id = $1",
        [user.id, pushToken || null]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("[auth/push-token]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── SmartCar ────────────────────────────────────────────────────────────────

  app.get("/api/smartcar/auth-url", (req: Request, res: Response) => {
    const clientId = process.env.SMARTCAR_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "SmartCar not configured" });
    const userId = (req.query.userId as string) || "guest";
    const redirectUri = getSmartcarRedirectUri();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "read_battery read_charge read_fuel read_vehicle_info read_odometer",
      state: userId,
      mode: "simulated",
    });
    console.log(`[SmartCar] auth-url redirectUri=${redirectUri}`);
    res.json({ url: `https://connect.smartcar.com/oauth/authorize?${params.toString()}`, redirectUri });
  });

  app.get("/api/smartcar/callback", async (req: Request, res: Response) => {
    const { code, state: userId, error } = req.query as Record<string, string>;
    if (error) {
      const html = fs.readFileSync(path.resolve(process.cwd(), "server", "templates", "smartcar-result.html"), "utf-8")
        .replace("{{STATUS}}", "error")
        .replace("{{MESSAGE}}", "Connection was cancelled or denied.");
      return res.setHeader("Content-Type", "text/html").send(html);
    }
    if (!code || !userId) return res.status(400).send("Missing code or state");
    try {
      const redirectUri = getSmartcarRedirectUri();
      const creds = Buffer.from(`${process.env.SMARTCAR_CLIENT_ID}:${process.env.SMARTCAR_CLIENT_SECRET}`).toString("base64");
      const tokenRes = await fetch("https://auth.smartcar.com/oauth/token", {
        method: "POST",
        headers: { Authorization: `Basic ${creds}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri }),
      });
      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error("[SmartCar] token exchange failed:", errText);
        const html = fs.readFileSync(path.resolve(process.cwd(), "server", "templates", "smartcar-result.html"), "utf-8")
          .replace("{{STATUS}}", "error")
          .replace("{{MESSAGE}}", "Could not connect your vehicle. Please try again.");
        return res.setHeader("Content-Type", "text/html").send(html);
      }
      const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; expires_in: number };
      const vehiclesRes = await fetch("https://api.smartcar.com/v2.0/vehicles", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const vehiclesJson = await vehiclesRes.json() as { vehicles: string[] };
      smartcarTokenStore.set(userId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
        vehicleIds: vehiclesJson.vehicles || [],
      });
      console.log(`[SmartCar] connected userId=${userId} vehicles=${(vehiclesJson.vehicles || []).length}`);
      const html = fs.readFileSync(path.resolve(process.cwd(), "server", "templates", "smartcar-result.html"), "utf-8")
        .replace("{{STATUS}}", "success")
        .replace("{{MESSAGE}}", `Connected! ${(vehiclesJson.vehicles || []).length} vehicle(s) linked. You can close this window and return to the app.`);
      res.setHeader("Content-Type", "text/html").send(html);
    } catch (err) {
      console.error("[SmartCar] callback error:", err);
      res.status(500).send("Internal server error");
    }
  });

  app.get("/api/smartcar/status", (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "guest";
    const data = smartcarTokenStore.get(userId);
    if (!data) return res.json({ connected: false });
    res.json({ connected: true, vehicleId: data.vehicleIds[0] || null, vehicleCount: data.vehicleIds.length });
  });

  app.get("/api/smartcar/vehicles", async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "guest";
    const token = await refreshSmartcarToken(userId);
    if (!token) return res.status(401).json({ error: "Not connected" });
    const data = smartcarTokenStore.get(userId)!;
    try {
      const vehicles = await Promise.all(data.vehicleIds.map(async (vid) => {
        const info = await smartcarRequest(`https://api.smartcar.com/v2.0/vehicles/${vid}`, token);
        return { id: vid, ...info };
      }));
      res.json({ vehicles });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/smartcar/vehicle/:vehicleId/battery", async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "guest";
    const token = await refreshSmartcarToken(userId);
    if (!token) return res.status(401).json({ error: "Not connected" });
    try {
      const [battery, charge] = await Promise.all([
        smartcarRequest(`https://api.smartcar.com/v2.0/vehicles/${req.params.vehicleId}/battery`, token),
        smartcarRequest(`https://api.smartcar.com/v2.0/vehicles/${req.params.vehicleId}/charge`, token).catch(() => null),
      ]);
      res.json({ battery, charge });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/smartcar/vehicle/:vehicleId/odometer", async (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "guest";
    const token = await refreshSmartcarToken(userId);
    if (!token) return res.status(401).json({ error: "Not connected" });
    try {
      const odometer = await smartcarRequest(`https://api.smartcar.com/v2.0/vehicles/${req.params.vehicleId}/odometer`, token);
      res.json(odometer);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.delete("/api/smartcar/disconnect", (req: Request, res: Response) => {
    const userId = (req.query.userId as string) || "guest";
    smartcarTokenStore.delete(userId);
    res.json({ success: true });
  });

  // ── Static pages ─────────────────────────────────────────────────────────────

  app.get("/privacy", (_req: Request, res: Response) => {
    const privacyPage = path.resolve(process.cwd(), "server", "templates", "privacy.html");
    if (fs.existsSync(privacyPage)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(fs.readFileSync(privacyPage, "utf-8"));
    } else {
      res.status(404).send("Privacy policy not found");
    }
  });

  function serveAdminPage(_req: Request, res: Response) {
    const adminPage = path.resolve(process.cwd(), "server", "templates", "admin.html");
    if (fs.existsSync(adminPage)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      // Force browser to clear service worker cache so Expo SW can't intercept this page
      res.setHeader("Clear-Site-Data", '"cache"');
      res.send(fs.readFileSync(adminPage, "utf-8"));
    } else {
      res.status(404).send("Admin page not found");
    }
  }
  app.get("/admin", serveAdminPage);
  app.get("/resqadmin", serveAdminPage);
  app.get("/api/admin-hub", serveAdminPage);

  // /go-admin and /rr-ops — aliases for the admin dashboard
  app.get("/go-admin", serveAdminPage);
  app.get("/rr-ops", serveAdminPage);

  // ── Admin auth ────────────────────────────────────────────────────────────────

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
    const submitted = (password || "").trim();
    if (!adminPassword) return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
    if (!submitted || submitted !== adminPassword) return res.status(401).json({ error: "Invalid password" });
    const token = signAdminToken();
    res.json({ token });
  });

  // ── Admin: providers ──────────────────────────────────────────────────────────

  app.get("/api/admin/providers", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<ProviderRow>("SELECT * FROM providers ORDER BY created_at DESC");
      res.json(rows.map((r) => {
        const p = rowToProvider(r);
        return {
          id: p.id, name: p.name, email: p.email, phone: p.phone,
          providerType: p.providerType, verificationStatus: p.verificationStatus,
          verificationDocuments: p.verificationDocuments || {},
          verificationSubmittedAt: p.verificationSubmittedAt || null,
          verificationNotes: p.verificationNotes || null,
          servicesOffered: p.servicesOffered,
          vehicleMake: p.vehicleMake, vehicleModel: p.vehicleModel,
          licensePlate: p.licensePlate, rating: p.rating, reviewCount: p.reviewCount,
          isAvailable: p.isAvailable,
        };
      }));
    } catch (err) {
      console.error("[admin/providers]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/approve", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET verification_status = 'verified', verification_notes = NULL, updated_at = NOW() WHERE id = $1",
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true, verificationStatus: "verified" });
    } catch (err) {
      console.error("[admin/approve]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/reject", adminAuth, async (req: Request, res: Response) => {
    const { notes } = req.body as { notes?: string };
    const noteText = notes || "Your documents were not accepted. Please re-upload and resubmit.";
    try {
      const { rowCount } = await pool.query(
        `UPDATE providers
         SET verification_status = 'not_started',
             verification_notes = $2,
             verification_documents = '{}',
             verification_submitted_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, noteText]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true, verificationStatus: "not_started", notes: noteText });
    } catch (err) {
      console.error("[admin/reject]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Admin: users ──────────────────────────────────────────────────────────────

  app.get("/api/admin/users", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, name, email, role, stripe_customer_id, push_token, created_at
         FROM auth_users ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      await pool.query("DELETE FROM sessions WHERE user_id = $1", [req.params.id]);
      const { rowCount } = await pool.query("DELETE FROM auth_users WHERE id = $1", [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: "User not found" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: jobs ───────────────────────────────────────────────────────────────

  app.get("/api/admin/jobs", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, service_type, status, estimated_cost, total_cost, tip,
                driver, provider, created_at, is_express, is_ev, is_emergency,
                receipt_number, location
         FROM jobs ORDER BY created_at DESC LIMIT 200`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: live jobs (active only, full detail) ───────────────────────────────
  app.get("/api/admin/live-jobs", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, service_type, status, estimated_cost, total_cost, tip,
                driver, provider, provider_location, eta, notes,
                created_at, is_express, is_ev, is_emergency, scheduled_date,
                receipt_number, location, service_fee
         FROM jobs
         WHERE status IN ('pending','accepted','en_route','arrived','in_progress')
            OR (status IN ('completed','cancelled')
                AND updated_at > NOW() - INTERVAL '24 hours')
         ORDER BY
           CASE WHEN status IN ('pending','accepted','en_route','arrived','in_progress') THEN 0 ELSE 1 END,
           created_at DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: cancel a job ───────────────────────────────────────────────────────
  app.post("/api/admin/jobs/:id/cancel", adminAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        `UPDATE jobs SET status='cancelled' WHERE id=$1 AND status NOT IN ('completed','cancelled') RETURNING id`,
        [id]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found or already finished." });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: earnings & payouts ─────────────────────────────────────────────────

  app.get("/api/admin/earnings", adminAuth, async (_req: Request, res: Response) => {
    try {
      const payoutsQ = pool.query(
        `SELECT pp.*, p.name as provider_name FROM provider_payouts pp
         LEFT JOIN providers p ON p.id = pp.provider_id
         ORDER BY pp.created_at DESC LIMIT 200`
      );
      const balancesQ = pool.query(
        `SELECT id, name, email, earnings_balance, stripe_account_id FROM providers ORDER BY earnings_balance DESC`
      );
      const revenueQ = pool.query(
        `SELECT COALESCE(SUM(service_fee),0) as total_fees,
                COALESCE(SUM(total_cost),0) as total_volume,
                COUNT(*) as total_jobs,
                COUNT(*) FILTER (WHERE status='completed') as completed_jobs
         FROM jobs`
      );
      const [payouts, balances, revenue] = await Promise.all([payoutsQ, balancesQ, revenueQ]);
      res.json({ payouts: payouts.rows, balances: balances.rows, stats: revenue.rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: reports ────────────────────────────────────────────────────────────

  app.get("/api/admin/reports", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, category, description, user_id, user_role, created_at
         FROM reports ORDER BY created_at DESC LIMIT 200`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: push notifications ─────────────────────────────────────────────────

  app.post("/api/admin/notify", adminAuth, async (req: Request, res: Response) => {
    const { title, body, target } = req.body as { title: string; body: string; target: "all" | "drivers" | "providers" };
    if (!title || !body) return res.status(400).json({ error: "title and body required" });
    try {
      let tokens: string[] = [];
      if (target === "drivers" || target === "all") {
        const { rows } = await pool.query(
          `SELECT push_token FROM auth_users WHERE push_token IS NOT NULL AND push_token != ''`
        );
        tokens = tokens.concat(rows.map((r: { push_token: string }) => r.push_token));
      }
      if (target === "providers" || target === "all") {
        const { rows } = await pool.query(
          `SELECT push_token FROM providers WHERE push_token IS NOT NULL AND push_token != ''`
        );
        tokens = tokens.concat(rows.map((r: { push_token: string }) => r.push_token));
      }
      if (tokens.length === 0) return res.json({ sent: 0, message: "No registered push tokens found" });
      const chunks: string[][] = [];
      for (let i = 0; i < tokens.length; i += 100) chunks.push(tokens.slice(i, i + 100));
      let sent = 0;
      for (const chunk of chunks) {
        const messages = chunk.map(to => ({ to, title, body, sound: "default" }));
        try {
          const r = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(messages),
          });
          if (r.ok) sent += chunk.length;
        } catch { /* continue */ }
      }
      res.json({ sent, total: tokens.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: announcements / waitlist ──────────────────────────────────────────

  app.get("/api/admin/waitlist", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, role, created_at FROM waitlist ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Waitlist signup (public) ──────────────────────────────────────────────────

  app.post("/api/waitlist", async (req: Request, res: Response) => {
    const { email, role } = req.body as { email?: string; role?: string };
    if (!email || !email.includes("@")) return res.status(400).json({ error: "Valid email required" });
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS waitlist (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          role VARCHAR(50),
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      );
      await pool.query(
        `INSERT INTO waitlist (email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET role = $2`,
        [email.toLowerCase().trim(), role || "driver"]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Web App routes ────────────────────────────────────────────────────────────

  app.get("/app", (_req: Request, res: Response) => {
    const webAppPath = path.resolve(process.cwd(), "server", "templates", "web-app.html");
    if (fs.existsSync(webAppPath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.send(fs.readFileSync(webAppPath, "utf-8"));
    } else {
      res.status(404).send("Web app not found");
    }
  });

  // ── Provider verification ─────────────────────────────────────────────────────

  app.post("/api/providers/:id/verification", async (req: Request, res: Response) => {
    const { verificationDocuments, verificationSubmittedAt } = req.body as {
      verificationDocuments: Record<string, boolean>;
      verificationSubmittedAt: string;
    };
    try {
      const { rowCount } = await pool.query(
        `UPDATE providers
         SET verification_documents = $2,
             verification_submitted_at = $3,
             verification_status = 'pending',
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id, JSON.stringify(verificationDocuments), verificationSubmittedAt]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/verification]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/providers/:id/verification", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<ProviderRow>(
        "SELECT * FROM providers WHERE id = $1", [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      const p = rowToProvider(rows[0]);
      res.json({
        verificationStatus: p.verificationStatus,
        verificationNotes: p.verificationNotes || null,
        verificationSubmittedAt: p.verificationSubmittedAt || null,
      });
    } catch (err) {
      console.error("[providers/verification GET]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── AI Diagnostics ────────────────────────────────────────────────────────────

  app.post("/api/diagnose", async (req: Request, res: Response) => {
    try {
      const { symptom, symptomLabel, followUpQuestions, followUpAnswers } = req.body;
      if (!symptom) return res.status(400).json({ error: "symptom is required" });
      const qaLines = (followUpQuestions || [])
        .map((q: { question: string; id: string }) => {
          const answer = (followUpAnswers || {})[q.id] || "Not answered";
          return `Q: ${q.question}\nA: ${answer}`;
        })
        .join("\n\n");
      const prompt = `You are an expert automotive roadside assistance diagnostic AI for the ResqRide app. A driver is stranded and needs help.

Primary symptom reported: "${symptomLabel || symptom}"

Follow-up answers from the driver:
${qaLines || "None provided"}

Based on these symptoms, provide a diagnosis and service recommendation. You MUST respond with ONLY valid JSON in this exact shape:

{
  "likelyIssue": "short issue name (e.g. Dead Battery)",
  "description": "2-3 sentence explanation of the issue and what to expect",
  "costRange": "price range as string (e.g. $35 - $55)",
  "serviceType": one of: "jump_start" | "flat_tire" | "fuel" | "lockout" | "towing" | "obd_diagnostic",
  "serviceLabel": "human-friendly service name",
  "confidence": integer 0-100,
  "tips": ["tip 1", "tip 2", "tip 3"]
}

Be concise, accurate, and reassuring. Base serviceType on what service would actually fix the problem.`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });
      const content = response.choices[0]?.message?.content || "{}";
      res.json(JSON.parse(content));
    } catch (error) {
      console.error("Diagnosis error:", error);
      res.status(500).json({ error: "Failed to generate diagnosis" });
    }
  });

  // ── Chat history ──────────────────────────────────────────────────────────────

  app.get("/api/chat/:conversationId/messages", (req: Request, res: Response) => {
    const history = messageHistory.get(req.params.conversationId) || [];
    res.json({ messages: history });
  });

  // ── Providers: nearby & register ─────────────────────────────────────────────

  app.get("/api/providers/nearby", async (req: Request, res: Response) => {
    const { lat, lng, radius } = req.query as Record<string, string>;
    const maxRadius = parseFloat(radius || "25");
    try {
      const { rows } = await pool.query<ProviderRow>(
        "SELECT * FROM providers WHERE is_available = true"
      );
      // Check which providers have an active (non-terminal) job
      const { rows: activeJobs } = await pool.query<{ provider_id: string }>(
        `SELECT provider->>'id' AS provider_id FROM jobs
         WHERE status NOT IN ('completed', 'cancelled') AND provider IS NOT NULL`
      );
      const busyIds = new Set(activeJobs.map((j) => j.provider_id).filter(Boolean));

      let result = rows.map((row) => ({
        ...rowToProvider(row),
        isBusy: busyIds.has(row.id),
      }));

      if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        result = result
          .map((p) => {
            const hasRealLocation = p.location.latitude !== 0 || p.location.longitude !== 0;
            const distance = hasRealLocation
              ? calcDistance(userLat, userLng, p.location.latitude, p.location.longitude)
              : null;
            return { ...p, distance };
          })
          .filter((p) => {
            const d = (p as ProviderRecord & { distance: number | null }).distance;
            return d === null || d <= maxRadius;
          })
          .sort((a, b) => {
            const dA = (a as ProviderRecord & { distance: number | null }).distance ?? 9999;
            const dB = (b as ProviderRecord & { distance: number | null }).distance ?? 9999;
            return dA - dB;
          });
      }
      res.json(result);
    } catch (err) {
      console.error("[providers/nearby]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/providers/by-email/:email", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<ProviderRow>(
        "SELECT * FROM providers WHERE email = $1",
        [decodeURIComponent(req.params.email).toLowerCase().trim()]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      res.json(rowToProvider(rows[0]));
    } catch (err) {
      console.error("[providers/by-email]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/providers/register", async (req: Request, res: Response) => {
    const data = req.body as ProviderRecord;
    if (!data.id || !data.name) return res.status(400).json({ error: "id and name required" });
    try {
      const { rows } = await pool.query<ProviderRow>(
        `INSERT INTO providers (
           id, name, phone, email, rating, review_count,
           vehicle_type, vehicle_make, vehicle_model, license_plate,
           services_offered, is_available, provider_type,
           verification_status, verification_documents, verification_submitted_at,
           verification_notes, badges, location, last_location_update, push_token,
           ev_capable, ev_services, accepts_priority_jobs
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           phone = EXCLUDED.phone,
           email = EXCLUDED.email,
           vehicle_type = EXCLUDED.vehicle_type,
           vehicle_make = EXCLUDED.vehicle_make,
           vehicle_model = EXCLUDED.vehicle_model,
           license_plate = EXCLUDED.license_plate,
           services_offered = EXCLUDED.services_offered,
           is_available = EXCLUDED.is_available,
           provider_type = EXCLUDED.provider_type,
           badges = EXCLUDED.badges,
           location = EXCLUDED.location,
           last_location_update = EXCLUDED.last_location_update,
           push_token = EXCLUDED.push_token,
           ev_capable = EXCLUDED.ev_capable,
           ev_services = EXCLUDED.ev_services,
           accepts_priority_jobs = EXCLUDED.accepts_priority_jobs,
           updated_at = NOW()
         RETURNING *`,
        [
          data.id, data.name, data.phone || "", data.email || "",
          data.rating ?? 4.8, data.reviewCount ?? 0,
          data.vehicleType || "service_van", data.vehicleMake || "",
          data.vehicleModel || "", data.licensePlate || "",
          JSON.stringify(data.servicesOffered || []),
          data.isAvailable ?? true, data.providerType || "independent",
          data.verificationStatus || "not_started",
          data.verificationDocuments ? JSON.stringify(data.verificationDocuments) : null,
          data.verificationSubmittedAt || null, data.verificationNotes || null,
          data.badges ? JSON.stringify(data.badges) : null,
          JSON.stringify(data.location || { latitude: 0, longitude: 0 }),
          new Date().toISOString(), data.pushToken || null,
          data.evCapable ?? false,
          JSON.stringify(data.evServices || []),
          data.acceptsPriorityJobs ?? false,
        ]
      );
      res.json(rowToProvider(rows[0]));
    } catch (err) {
      console.error("[providers/register]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/providers/:id/location", async (req: Request, res: Response) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET location = $2, last_location_update = $3, updated_at = NOW() WHERE id = $1",
        [req.params.id, JSON.stringify({ latitude, longitude }), new Date().toISOString()]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/location]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/providers/:id/availability", async (req: Request, res: Response) => {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ error: "isAvailable (boolean) required" });
    }
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET is_available = $2, updated_at = NOW() WHERE id = $1",
        [req.params.id, isAvailable]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/availability]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/providers/:id/push-token", async (req: Request, res: Response) => {
    const { pushToken } = req.body as { pushToken: string };
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET push_token = $2, updated_at = NOW() WHERE id = $1",
        [req.params.id, pushToken || null]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/push-token]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/providers/:id/settings", async (req: Request, res: Response) => {
    const { acceptsPriorityJobs } = req.body as { acceptsPriorityJobs?: boolean };
    try {
      const { rowCount } = await pool.query(
        `UPDATE providers SET accepts_priority_jobs = $2, updated_at = NOW() WHERE id = $1`,
        [req.params.id, acceptsPriorityJobs ?? false]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/settings]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Payout bank account ────────────────────────────────────────────────────
  app.get("/api/providers/:id/payout-bank", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<ProviderRow>(
        "SELECT payout_bank_info FROM providers WHERE id = $1", [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      const info = rows[0].payout_bank_info;
      if (!info) return res.json({ bankAccount: null });
      res.json({
        bankAccount: {
          bankName: info.bankName,
          accountType: info.accountType,
          accountHolderName: info.accountHolderName,
          routingLast4: info.routingNumber.slice(-4),
          accountLast4: info.accountNumber.slice(-4),
        },
      });
    } catch (err) {
      console.error("[providers/payout-bank GET]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/providers/:id/payout-bank", async (req: Request, res: Response) => {
    const { bankName, accountType, accountHolderName, routingNumber, accountNumber } = req.body as {
      bankName: string; accountType: string; accountHolderName: string;
      routingNumber: string; accountNumber: string;
    };
    if (!bankName || !accountType || !accountHolderName || !routingNumber || !accountNumber) {
      return res.status(400).json({ error: "All bank account fields are required" });
    }
    if (routingNumber.length !== 9 || !/^\d+$/.test(routingNumber)) {
      return res.status(400).json({ error: "Routing number must be exactly 9 digits" });
    }
    if (accountNumber.length < 4 || accountNumber.length > 17 || !/^\d+$/.test(accountNumber)) {
      return res.status(400).json({ error: "Account number must be 4–17 digits" });
    }
    try {
      const { rowCount } = await pool.query(
        `UPDATE providers SET payout_bank_info = $2, updated_at = NOW() WHERE id = $1`,
        [req.params.id, JSON.stringify({ bankName, accountType, accountHolderName, routingNumber, accountNumber })]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({
        bankAccount: {
          bankName,
          accountType,
          accountHolderName,
          routingLast4: routingNumber.slice(-4),
          accountLast4: accountNumber.slice(-4),
        },
      });
    } catch (err) {
      console.error("[providers/payout-bank POST]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/providers/:id/payout-bank", async (req: Request, res: Response) => {
    try {
      const { rowCount } = await pool.query(
        `UPDATE providers SET payout_bank_info = NULL, updated_at = NOW() WHERE id = $1`,
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/payout-bank DELETE]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/providers/:id", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<ProviderRow>(
        "SELECT * FROM providers WHERE id = $1", [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      const p = rowToProvider(rows[0]);
      res.json({
        id: p.id, rating: p.rating, reviewCount: p.reviewCount,
        isAvailable: p.isAvailable, verificationStatus: p.verificationStatus,
      });
    } catch (err) {
      console.error("[providers/:id]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Provider Earnings & Payouts ───────────────────────────────────────────────

  app.get("/api/providers/:id/earnings", async (req: Request, res: Response) => {
    try {
      const { rows: provRows } = await pool.query<{ earnings_balance: number; payout_bank_info: Record<string, unknown> | null }>(
        "SELECT earnings_balance, payout_bank_info FROM providers WHERE id = $1",
        [req.params.id]
      );
      if (!provRows.length) return res.status(404).json({ error: "Provider not found" });
      const { rows: payoutRows } = await pool.query(
        "SELECT * FROM provider_payouts WHERE provider_id = $1 ORDER BY created_at DESC LIMIT 50",
        [req.params.id]
      );
      res.json({
        balance: Number(provRows[0].earnings_balance ?? 0),
        payouts: payoutRows.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          fee: Number(p.fee),
          netAmount: Number(p.net_amount),
          payoutType: p.payout_type,
          status: p.status,
          bankLast4: p.bank_last4,
          createdAt: p.created_at,
        })),
      });
    } catch (err) {
      console.error("[earnings GET]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/providers/:id/payout", async (req: Request, res: Response) => {
    const { amount, payoutType } = req.body as { amount?: number; payoutType?: string };
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Valid amount required" });
    }
    if (!["instant", "standard"].includes(payoutType ?? "")) {
      return res.status(400).json({ error: "payoutType must be 'instant' or 'standard'" });
    }
    const MIN_PAYOUT = 5;
    if (amount < MIN_PAYOUT) {
      return res.status(400).json({ error: `Minimum payout is $${MIN_PAYOUT}` });
    }
    try {
      const { rows: provRows } = await pool.query<{ earnings_balance: number; payout_bank_info: Record<string, unknown> | null }>(
        "SELECT earnings_balance, payout_bank_info FROM providers WHERE id = $1",
        [req.params.id]
      );
      if (!provRows.length) return res.status(404).json({ error: "Provider not found" });
      const balance = Number(provRows[0].earnings_balance ?? 0);
      if (amount > balance) {
        return res.status(400).json({ error: "Amount exceeds available balance" });
      }
      const bankInfo = provRows[0].payout_bank_info as Record<string, string> | null;
      if (!bankInfo) {
        return res.status(400).json({ error: "Add a bank account before requesting a payout" });
      }
      const fee = payoutType === "instant" ? Math.round(amount * 0.015 * 100) / 100 : 0;
      const netAmount = Math.round((amount - fee) * 100) / 100;
      const payoutId = `payout-${Date.now()}`;
      const bankLast4 = (bankInfo.accountNumber as string)?.slice(-4) ?? null;

      await pool.query(
        `INSERT INTO provider_payouts (id, provider_id, amount, fee, net_amount, payout_type, status, bank_last4)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [payoutId, req.params.id, amount, fee, netAmount, payoutType, bankLast4]
      );
      await pool.query(
        "UPDATE providers SET earnings_balance = earnings_balance - $2 WHERE id = $1",
        [req.params.id, amount]
      );
      res.json({
        payout: {
          id: payoutId,
          amount,
          fee,
          netAmount,
          payoutType,
          status: "pending",
          bankLast4,
          createdAt: new Date().toISOString(),
        },
        newBalance: Math.max(0, balance - amount),
      });
    } catch (err) {
      console.error("[payout POST]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Stripe Connect (provider onboarding) ─────────────────────────────────────

  app.post("/api/stripe/connect/onboard", async (req: Request, res: Response) => {
    const { providerId } = req.body as { providerId?: string };
    if (!providerId) return res.status(400).json({ error: "providerId required" });
    try {
      const { rows } = await pool.query<{ email: string; name: string; stripe_account_id: string | null }>(
        "SELECT email, name, stripe_account_id FROM providers WHERE id = $1",
        [providerId]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      const stripe = await getUncachableStripeClient();
      let accountId = rows[0].stripe_account_id;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          country: "US",
          email: rows[0].email || undefined,
          capabilities: { transfers: { requested: true } },
          business_profile: { name: rows[0].name || "ResqRide Provider" },
          metadata: { providerId },
        });
        accountId = account.id;
        await pool.query("UPDATE providers SET stripe_account_id = $2 WHERE id = $1", [providerId, accountId]);
      }

      const domain = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${domain}/api/stripe/connect/refresh/${providerId}`,
        return_url: `${domain}/api/stripe/connect/return/${providerId}`,
        type: "account_onboarding",
      });

      res.json({ url: accountLink.url, accountId });
    } catch (err: any) {
      console.error("[stripe/connect/onboard]", err.message);
      res.status(500).json({ error: err.message || "Failed to create onboarding link" });
    }
  });

  app.get("/api/stripe/connect/status/:providerId", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ stripe_account_id: string | null }>(
        "SELECT stripe_account_id FROM providers WHERE id = $1",
        [req.params.providerId]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      const accountId = rows[0].stripe_account_id;
      if (!accountId) return res.json({ connected: false, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false });

      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(accountId);
      res.json({
        connected: true,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        accountId,
      });
    } catch (err: any) {
      console.error("[stripe/connect/status]", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch status" });
    }
  });

  app.get("/api/stripe/connect/return/:providerId", (_req: Request, res: Response) => {
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>ResqRide — Setup Complete</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#0A0E27;color:#fff;text-align:center;padding:32px}
.icon{width:72px;height:72px;background:rgba(0,212,255,0.15);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:36px}
h2{font-size:26px;font-weight:800;margin-bottom:12px}
p{color:rgba(255,255,255,0.65);line-height:1.6;margin-bottom:8px;font-size:15px}
.steps{background:rgba(255,255,255,0.06);border-radius:16px;padding:20px 24px;margin:28px 0;text-align:left;width:100%;max-width:340px}
.step{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;font-size:14px;color:rgba(255,255,255,0.75)}
.step:last-child{margin-bottom:0}
.num{background:#00D4FF;color:#0A0E27;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0;margin-top:1px}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(0,212,255,0.12);border:1px solid rgba(0,212,255,0.3);color:#00D4FF;padding:6px 14px;border-radius:100px;font-size:13px;font-weight:600;margin-top:4px}
</style></head>
<body>
<div class="icon">&#10003;</div>
<h2>Bank Connected!</h2>
<p>Your Stripe payout account is set up.<br>You can now receive real earnings.</p>
<div class="steps">
  <div class="step"><div class="num">1</div><span>Close this page using your browser's back button or swipe down</span></div>
  <div class="step"><div class="num">2</div><span>Return to the ResqRide app — it will update automatically</span></div>
  <div class="step"><div class="num">3</div><span>Your Payment Settings will show <strong style="color:#00D4FF">Stripe Payouts Active</strong></span></div>
</div>
<div class="badge">&#10003; &nbsp;Setup complete</div>
</body></html>`);
  });

  app.get("/api/stripe/connect/refresh/:providerId", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ stripe_account_id: string | null }>(
        "SELECT stripe_account_id FROM providers WHERE id = $1",
        [req.params.providerId]
      );
      const accountId = rows[0]?.stripe_account_id;
      if (!accountId) return res.redirect("/");
      const stripe = await getUncachableStripeClient();
      const domain = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "http://localhost:5000";
      const link = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${domain}/api/stripe/connect/refresh/${req.params.providerId}`,
        return_url: `${domain}/api/stripe/connect/return/${req.params.providerId}`,
        type: "account_onboarding",
      });
      res.redirect(link.url);
    } catch (err: any) {
      console.error("[stripe/connect/refresh]", err.message);
      res.status(500).send("Failed to refresh onboarding link. Please return to the app and try again.");
    }
  });

  // ── Jobs ──────────────────────────────────────────────────────────────────────

  app.post("/api/jobs", async (req: Request, res: Response) => {
    const data = req.body as Partial<JobRecord>;
    if (!data.id || !data.serviceType) return res.status(400).json({ error: "id and serviceType required" });
    console.log(`[jobs POST] received id=${data.id} type=${data.serviceType} status=${(data as any).status ?? "pending"}`);
    // Detect EV job: explicit flag or notes convention ("EV " prefix)
    const isEV = data.isEV ?? (typeof data.notes === "string" && data.notes.startsWith("EV "));
    try {
      const { rows } = await pool.query<JobRow>(
        `INSERT INTO jobs (
           id, service_type, location, notes, status, estimated_cost,
           driver, eta, is_express, express_fee, service_fee, total_cost,
           receipt_number, time_saved, created_at, is_emergency, is_ev
         ) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          data.id, data.serviceType,
          JSON.stringify(data.location ?? { address: "Unknown", latitude: 0, longitude: 0 }),
          data.notes ?? "", data.estimatedCost ?? 0,
          data.driver ? JSON.stringify(data.driver) : null,
          data.eta ?? null, data.isExpress ?? null,
          data.expressFee ?? null, data.serviceFee ?? null,
          data.totalCost ?? null, data.receiptNumber ?? null,
          data.timeSaved ?? null,
          data.createdAt ?? new Date().toISOString(),
          data.isEmergency ?? null,
          isEV,
        ]
      );

      // If conflict fired (DO NOTHING), fetch the existing row so we return real DB state
      let job: JobRecord;
      if (rows.length > 0) {
        job = rowToJob(rows[0]);
      } else {
        const existing = await pool.query<JobRow>("SELECT * FROM jobs WHERE id = $1", [data.id]);
        job = existing.rows.length
          ? rowToJob(existing.rows[0])
          : { ...data, status: "pending", isEV, createdAt: new Date().toISOString() } as JobRecord;
      }

      // Only broadcast if the job is still pending (don't re-advertise accepted/cancelled jobs)
      if (job.status === "pending") {
        broadcastJobUpdate(job as JobRecord);
      }

      // Push notifications — EV jobs only go to EV-capable providers
      const providerQuery = isEV
        ? "SELECT push_token FROM providers WHERE is_available = true AND ev_capable = true AND push_token IS NOT NULL"
        : "SELECT push_token FROM providers WHERE is_available = true AND push_token IS NOT NULL";
      const { rows: providers } = await pool.query<ProviderRow>(providerQuery);
      const tokens = providers.map((p) => p.push_token as string).filter(Boolean);
      if (tokens.length > 0) {
        const serviceLabels: Record<string, string> = {
          flat_tire: "Flat Tire", jump_start: "Jump Start", tow: "Tow Service",
          fuel: "Fuel Delivery", lockout: "Lockout", obd_diagnostic: "OBD Diagnostic",
        };
        const baseLabel = serviceLabels[job.serviceType] || "Roadside Assistance";
        const serviceLabel = isEV
          ? (job.serviceType === "fuel" ? "EV Mobile Charging" : "EV-Safe Towing")
          : baseLabel;
        const urgency = job.isEmergency ? "EMERGENCY: " : (isEV ? "EV Job: " : "");
        const messages = tokens.map((to) => ({
          to, title: `${urgency}New Job Request`,
          body: `${serviceLabel} needed nearby — ~$${Math.round((job.totalCost ?? job.estimatedCost ?? 0) * 0.85)} payout. Tap to accept.`,
          data: { screen: "ProviderDashboard" }, sound: "default",
          priority: job.isEmergency ? "high" : "normal",
          channelId: job.isEmergency ? "emergency" : "default",
        }));
        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify(messages),
        }).catch((err) => console.error("[PUSH] Failed:", err));
      }
      res.json(job);
    } catch (err) {
      console.error("[jobs POST]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/jobs/pending", async (_req: Request, res: Response) => {
    try {
      // Auto-expire jobs older than 30 minutes so stale requests never linger
      await pool.query(
        "UPDATE jobs SET status = 'expired' WHERE status = 'pending' AND created_at::timestamptz < NOW() - INTERVAL '30 minutes'"
      ).catch(() => {});
      const { rows } = await pool.query<JobRow>(
        "SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC"
      );
      res.set("Cache-Control", "no-store, no-cache, must-revalidate");
      res.set("Pragma", "no-cache");
      res.removeHeader("ETag");
      res.json(rows.map(rowToJob));
    } catch (err) {
      console.error("[jobs/pending]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/jobs/:id", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<JobRow>("SELECT * FROM jobs WHERE id = $1", [req.params.id]);
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      res.set("Cache-Control", "no-store");
      res.json(rowToJob(rows[0]));
    } catch (err) {
      console.error("[jobs/:id]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/jobs/:id/accept", async (req: Request, res: Response) => {
    const jobId = req.params.id;
    console.log(`[ACCEPT] job=${jobId}`);
    try {
      const provLoc = req.body.providerLocation;
      const { rows } = await pool.query<JobRow>(
        `UPDATE jobs
         SET status = 'accepted', provider = $2, eta = $3,
             provider_location = COALESCE($4, provider_location),
             updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [
          jobId,
          req.body.provider ? JSON.stringify(req.body.provider) : null,
          req.body.eta ?? 8,
          provLoc ? JSON.stringify(provLoc) : null,
        ]
      );
      if (!rows.length) {
        // Check if it exists but was already taken
        const check = await pool.query("SELECT status FROM jobs WHERE id = $1", [jobId]);
        if (!check.rows.length) return res.status(404).json({ error: "Job not found" });
        return res.status(409).json({ error: "Job already taken" });
      }
      const job = rowToJob(rows[0]);
      console.log(`[ACCEPT] updated to accepted, provider=${JSON.stringify(job.provider)}`);
      broadcastJobUpdate(job as JobRecord);

      // Push notification to driver
      const driverEmail = (job.driver as Record<string, unknown> | undefined)?.email as string | undefined;
      if (driverEmail) {
        const driverToken = await getDriverPushToken(driverEmail).catch(() => null);
        if (driverToken) {
          const providerName = (job.provider as Record<string, unknown> | undefined)?.name as string || "A provider";
          console.log(`[PUSH] Sending accepted notification to driver ${driverEmail}`);
          sendPush(
            [driverToken],
            "Provider Accepted Your Request",
            `${providerName} is on their way — ETA ~${job.eta ?? 8} mins`,
            { screen: "ActiveService" }
          );
        } else {
          console.log(`[PUSH] No push token for driver ${driverEmail} — skipping accepted notification`);
        }
      } else {
        console.log(`[PUSH] No driver email on job ${jobId} — cannot send accepted notification`);
      }

      res.json(job);
    } catch (err) {
      console.error("[jobs/accept]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/jobs/:id/cancel", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<JobRow>(
        "UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      res.json(rowToJob(rows[0]));
    } catch (err) {
      console.error("[jobs/cancel]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/jobs/:id/status", async (req: Request, res: Response) => {
    const { status } = req.body as { status: string };
    if (!status) return res.status(400).json({ error: "status required" });
    try {
      const { rows } = await pool.query<JobRow>(
        "UPDATE jobs SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id, status]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      const job = rowToJob(rows[0]);
      broadcastJobUpdate(job as JobRecord);

      // On completion, immediately credit provider's base earnings so they are paid
      // even if the driver never reaches the tip/rating screen.
      if (status === "completed") {
        const completedProviderId = (job.provider as Record<string, unknown> | undefined)?.id as string | undefined;
        if (completedProviderId) {
          try {
            const { rows: prov } = await pool.query<{ accepts_priority_jobs: boolean }>(
              "SELECT accepts_priority_jobs FROM providers WHERE id = $1",
              [completedProviderId]
            );
            const gross = job.totalCost ?? job.estimatedCost ?? 0;
            const feeRate = (job.isExpress && prov[0]?.accepts_priority_jobs) ? 0.10 : 0.15;
            const netBase = Math.round(gross * (1 - feeRate) * 100) / 100;
            if (netBase > 0) {
              await pool.query(
                "UPDATE providers SET earnings_balance = COALESCE(earnings_balance, 0) + $2 WHERE id = $1",
                [completedProviderId, netBase]
              );
              await pool.query("UPDATE jobs SET earnings_credited = TRUE WHERE id = $1", [req.params.id]);
            }
          } catch (e: any) {
            console.error("[earnings/completion]", e.message);
          }
        }
      }

      // Push to driver on meaningful status changes
      const statusPush: Record<string, { title: string; body: string }> = {
        en_route:    { title: "Provider En Route", body: `${(job.provider as any)?.name || "Your provider"} is heading your way` },
        arrived:     { title: "Provider Arrived", body: "Your service provider has arrived at your location" },
        in_progress: { title: "Service In Progress", body: "Your service is now underway" },
        completed:   { title: "Service Complete", body: "Your service is complete — rate your experience" },
        cancelled:   { title: "Request Cancelled", body: "Your service request has been cancelled" },
      };
      const pushInfo = statusPush[status];
      if (pushInfo) {
        const driverEmail = (job.driver as Record<string, unknown> | undefined)?.email as string | undefined;
        if (driverEmail) {
          const driverToken = await getDriverPushToken(driverEmail).catch(() => null);
          if (driverToken) {
            console.log(`[PUSH] Sending ${status} notification to driver ${driverEmail}`);
            sendPush([driverToken], pushInfo.title, pushInfo.body, { screen: "ActiveService" },
              { priority: status === "cancelled" ? "high" : "normal" });
          } else {
            console.log(`[PUSH] No push token for driver ${driverEmail} — skipping ${status} notification`);
          }
        } else {
          console.log(`[PUSH] No driver email on job ${req.params.id} — cannot send ${status} notification`);
        }
      }

      res.json(job);
    } catch (err) {
      console.error("[jobs/status]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/jobs/:id/location", async (req: Request, res: Response) => {
    const { latitude, longitude } = req.body as { latitude: number; longitude: number };
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    try {
      const { rows } = await pool.query<JobRow>(
        "UPDATE jobs SET provider_location = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id, JSON.stringify({ latitude, longitude })]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      const job = rowToJob(rows[0]);
      broadcastJobUpdate(job as JobRecord);
      res.json({ success: true });
    } catch (err) {
      console.error("[jobs/location]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/jobs/:id/tip", async (req: Request, res: Response) => {
    const { tip, totalCost, driverRating } = req.body as { tip?: number; totalCost?: number; driverRating?: number };
    try {
      const { rows } = await pool.query<JobRow>(
        `UPDATE jobs
         SET tip = COALESCE($2, tip),
             total_cost = COALESCE($3, total_cost),
             driver_rating = COALESCE($4, driver_rating),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [req.params.id, tip ?? null, totalCost ?? null, driverRating ?? null]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      const job = rowToJob(rows[0]);

      // Recalculate provider rating if a driver rating was given
      if (typeof driverRating === "number" && driverRating >= 1 && driverRating <= 5) {
        const providerId = (job.provider as Record<string, unknown> | undefined)?.id as string | undefined;
        if (providerId) {
          const { rows: ratedJobs } = await pool.query<{ avg: string; cnt: string }>(
            `SELECT AVG(driver_rating)::numeric(4,2) AS avg, COUNT(*) AS cnt
             FROM jobs
             WHERE provider->>'id' = $1 AND driver_rating IS NOT NULL`,
            [providerId]
          );
          if (ratedJobs.length) {
            const avg = Math.round(parseFloat(ratedJobs[0].avg) * 10) / 10;
            const cnt = parseInt(ratedJobs[0].cnt, 10);
            await pool.query(
              "UPDATE providers SET rating = $2, review_count = $3, updated_at = NOW() WHERE id = $1",
              [providerId, avg, cnt]
            );
          }
        }
      }

      broadcastJobUpdate(job as JobRecord);

      // Credit provider's earnings balance + attempt Stripe Connect transfer
      const providerId = (job.provider as Record<string, unknown> | undefined)?.id as string | undefined;
      if (providerId) {
        try {
          const { rows: provRows } = await pool.query<{ stripe_account_id: string; accepts_priority_jobs: boolean }>(
            "SELECT stripe_account_id, accepts_priority_jobs FROM providers WHERE id = $1",
            [providerId]
          );
          const gross = job.totalCost ?? job.estimatedCost ?? 0;
          const feeRate = (job.isExpress && provRows[0]?.accepts_priority_jobs) ? 0.10 : 0.15;
          const tipAmt = typeof job.tip === "number" ? job.tip : 0;
          // If base earnings were already credited when status was set to "completed",
          // only add the tip delta to avoid double-counting the base service amount.
          const earningsCredited = (rows[0] as any).earnings_credited ?? false;
          const netAmount = earningsCredited
            ? Math.round(tipAmt * 100) / 100
            : Math.round((gross * (1 - feeRate) + tipAmt) * 100) / 100;

          // Credit the in-app earnings balance so providers can cash out anytime
          if (netAmount > 0) {
            await pool.query(
              "UPDATE providers SET earnings_balance = COALESCE(earnings_balance, 0) + $2 WHERE id = $1",
              [providerId, netAmount]
            ).catch((e) => console.error("[earnings_balance credit]", e.message));
          }

          // Attempt Stripe Connect transfer if the provider has an account
          const provStripeId = provRows[0]?.stripe_account_id;
          if (provStripeId) {
            const netCents = Math.round(netAmount * 100);
            if (netCents > 50) {
              const stripe = await getUncachableStripeClient();
              await stripe.transfers.create({
                amount: netCents,
                currency: "usd",
                destination: provStripeId,
                metadata: { jobId: job.id, providerId },
              });
            }
          }
        } catch (err: any) {
          console.error("[stripe/transfer]", err.message);
        }
      }

      res.json({ success: true });
    } catch (err) {
      console.error("[jobs/tip]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── EV Chargers Proxy ─────────────────────────────────────────────────────────

  app.get("/api/ev/chargers", async (req: Request, res: Response) => {
    const { lat, lon } = req.query as { lat?: string; lon?: string };
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Overpass API (OpenStreetMap) – free, no key, global coverage
    const radiusMeters = 32000; // ~20 miles
    const query =
      `[out:json][timeout:20];` +
      `(node["amenity"="charging_station"](around:${radiusMeters},${lat},${lon});` +
      `way["amenity"="charging_station"](around:${radiusMeters},${lat},${lon}););` +
      `out body center;`;

    try {
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) throw new Error(`Overpass responded ${response.status}`);

      const json = await response.json() as { elements: Record<string, unknown>[] };

      type OverpassEl = {
        id: number;
        lat?: number;
        lon?: number;
        center?: { lat: number; lon: number };
        tags?: Record<string, string>;
      };

      const chargers = (json.elements as OverpassEl[])
        .map((el) => {
          const tags = el.tags ?? {};
          const eLat = el.lat ?? el.center?.lat;
          const eLon = el.lon ?? el.center?.lon;
          if (!eLat || !eLon) return null;

          // DC Fast detection via socket tags or maxpower
          const hasDCFast =
            !!tags["socket:chademo"] ||
            !!tags["socket:ccs"] ||
            !!tags["socket:type2_cable"] ||
            !!tags["socket:tesla_supercharger"] ||
            !!tags["socket:tesla_ccs"] ||
            (!!tags["maxpower"] && parseInt(tags["maxpower"]) >= 50);

          const capacity = Math.max(
            parseInt(tags["capacity"] ?? "0") ||
            parseInt(tags["capacity:charging"] ?? "0") ||
            1,
            1
          );

          const dLat = (eLat - latNum) * Math.PI / 180;
          const dLon = (eLon - lonNum) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(latNum * Math.PI / 180) * Math.cos(eLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          const distMi = 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          const addrParts = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean);
          const address =
            addrParts.length > 0
              ? addrParts.join(" ")
              : tags["addr:city"] || tags["addr:suburb"] || "";

          const name =
            tags["name"] ||
            tags["operator"] ||
            tags["brand"] ||
            "Charging Station";

          const price =
            tags["fee"] === "no"
              ? "Free"
              : tags["charge"] || tags["fee:conditional"] || "Varies";

          const isOffline = tags["operational_status"] === "closed" ||
            tags["disused:amenity"] === "charging_station";

          return {
            id: String(el.id),
            name,
            address,
            latitude: eLat,
            longitude: eLon,
            distanceMi: distMi,
            distance: distMi < 0.1 ? "< 0.1 mi" : `${distMi.toFixed(1)} mi`,
            chargerCount: capacity,
            available: isOffline ? 0 : capacity,
            speed: hasDCFast ? "DC Fast" : "Level 2",
            network: tags["operator"] || tags["brand"] || tags["network"] || "Unknown",
            pricePerKwh: price,
          };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.distanceMi - b.distanceMi)
        .slice(0, 40);

      console.log(`[ev/chargers] lat=${lat} lon=${lon} → ${chargers.length} stations`);
      res.json(chargers);
    } catch (err) {
      console.error("[ev/chargers]", err);
      res.status(502).json({ error: "Failed to fetch charger data" });
    }
  });

  // ── Report a Problem ──────────────────────────────────────────────────────────

  app.post("/api/reports", async (req: Request, res: Response) => {
    const { category, description, userId, userRole } = req.body as {
      category: string; description: string; userId?: string; userRole?: string;
    };
    if (!category || !description) {
      return res.status(400).json({ error: "category and description are required" });
    }
    try {
      const reportId = `rep-${Date.now()}`;
      await pool.query(
        "INSERT INTO reports (id, category, description, user_id, user_role) VALUES ($1,$2,$3,$4,$5)",
        [reportId, category, description.slice(0, 1000), userId || null, userRole || null]
      );
      console.log(`[REPORT] id=${reportId} category=${category} user=${userId || "anonymous"}`);
      res.status(201).json({ success: true, reportId });
    } catch (err) {
      console.error("[reports POST]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Support Chat ──────────────────────────────────────────────────────────────

  app.post("/api/support/chat", async (req: Request, res: Response) => {
    try {
      const { message, history } = req.body as {
        message: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
      };
      if (!message) return res.status(400).json({ error: "message required" });
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
        {
          role: "system",
          content:
            "You are a helpful customer support agent for ResqRide, a roadside assistance app. " +
            "You help drivers and service providers with service requests, payments, the app, and safety concerns. " +
            "Be concise, empathetic, and professional. Keep responses under 3 sentences unless more detail is needed. " +
            "For emergencies always direct users to call 911.",
        },
        ...(history || []).slice(-6),
        { role: "user", content: message },
      ];
      const response = await openai.chat.completions.create({
        model: "gpt-4o", messages, max_tokens: 250,
      });
      const reply = response.choices[0]?.message?.content ||
        "I couldn't process your message right now. Please call 1-800-SERVICE for immediate assistance.";
      res.json({ reply });
    } catch (error) {
      console.error("[Support chat error]", error);
      res.status(500).json({ error: "Support chat unavailable" });
    }
  });

  // ── WebSocket + HTTP server ───────────────────────────────────────────────────

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  broadcastJobUpdate = (job: JobRecord) => {
    const data = JSON.stringify({ type: "job_status_update", job });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
    console.log(`[WS BROADCAST] job=${job.id} status=${job.status} clients=${wss.clients.size}`);
  };

  wss.on("connection", (ws: WebSocket) => {
    let clientRecord: WsClient | null = null;

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "join") {
          const { conversationId, senderId, senderRole, isNotifier } = data;
          clientRecord = { ws, conversationId, senderId, senderRole, isNotifier: !!isNotifier };
          clients.add(clientRecord);
          const history = messageHistory.get(conversationId) || [];
          ws.send(JSON.stringify({ type: "history", messages: history }));
          return;
        }

        if (data.type === "message" && clientRecord) {
          const { conversationId, senderId, senderRole, content } = data;
          const message: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            conversationId, senderId, senderRole, content,
            timestamp: new Date().toISOString(),
          };
          const history = messageHistory.get(conversationId) || [];
          history.push(message);
          if (history.length > 200) history.splice(0, history.length - 200);
          messageHistory.set(conversationId, history);

          ws.send(JSON.stringify({ type: "message", message }));
          broadcastToConversation(conversationId, { type: "message", message }, clientRecord);

          const realPeersInRoom = [...clients].filter(
            (c) => c.conversationId === conversationId && c !== clientRecord && !c.isNotifier
          );
          if (realPeersInRoom.length === 0) {
            const replyDelay = 2000 + Math.random() * 2000;
            setTimeout(() => {
              // Re-check: if a real (non-notifier) peer joined since the message was sent, skip
              const currentPeers = [...clients].filter(
                (c) => c.conversationId === conversationId && c !== clientRecord && !c.isNotifier
              );
              if (currentPeers.length > 0) return;

              const autoReply: ChatMessage = {
                id: `msg-${Date.now()}-auto`,
                conversationId,
                senderId: senderRole === "driver" ? "auto-provider" : "auto-driver",
                senderRole: senderRole === "driver" ? "provider" : "driver",
                content: getAutoReply(senderRole || "driver"),
                timestamp: new Date().toISOString(),
              };
              const autoHistory = messageHistory.get(conversationId) || [];
              autoHistory.push(autoReply);
              messageHistory.set(conversationId, autoHistory);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "message", message: autoReply }));
              }
            }, replyDelay);
          }
        }
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    });

    ws.on("close", () => {
      if (clientRecord) clients.delete(clientRecord);
    });
  });

  return httpServer;
}
