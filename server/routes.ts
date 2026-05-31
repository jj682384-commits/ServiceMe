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
  serviceRadiusMiles?: number;
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

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const _rlStore = new Map<string, { count: number; resetAt: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rlStore) { if (now > v.resetAt) _rlStore.delete(k); }
}, 5 * 60 * 1000);

function makeRateLimiter(limit: number, windowMs: number) {
  return function rlMiddleware(req: Request, res: Response, next: NextFunction) {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "x";
    const key = `${ip}::${limit}::${windowMs}`;
    const now = Date.now();
    const entry = _rlStore.get(key);
    if (!entry || now > entry.resetAt) {
      _rlStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    }
    return next();
  };
}
const generalLimit = makeRateLimiter(100, 60_000);  // 100 req/min per IP
const authLimit    = makeRateLimiter(10,  60_000);  // 10 req/min per IP (auth endpoints)

// ── Account Lockout ────────────────────────────────────────────────────────────
const _loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _loginAttempts) { if (now > v.lockedUntil && v.count === 0) _loginAttempts.delete(k); }
}, 15 * 60 * 1000);

function isAccountLocked(email: string): { locked: boolean; retryAfterSec: number } {
  const entry = _loginAttempts.get(email.toLowerCase());
  if (!entry || !entry.lockedUntil) return { locked: false, retryAfterSec: 0 };
  if (Date.now() < entry.lockedUntil) {
    return { locked: true, retryAfterSec: Math.ceil((entry.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

function recordFailedLogin(email: string): void {
  const key = email.toLowerCase();
  const entry = _loginAttempts.get(key);
  if (!entry) { _loginAttempts.set(key, { count: 1, lockedUntil: 0 }); return; }
  entry.count = (entry.count || 0) + 1;
  if (entry.count >= 5) entry.lockedUntil = Date.now() + 15 * 60 * 1000;
}

function clearLoginAttempts(email: string): void {
  _loginAttempts.delete(email.toLowerCase());
}

// ── Per-user rate limiter (keyed by user email extracted from token) ───────────
function makeUserRateLimiter(limit: number, windowMs: number) {
  return async function userRlMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"] as string | undefined;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
    if (!token) return next();
    const { rows } = await pool.query<{ email: string }>(
      `SELECT u.email FROM sessions s
       JOIN auth_users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`, [token]
    ).catch(() => ({ rows: [] }));
    if (!rows.length) return next();
    const key = `user::${rows[0].email}::${limit}::${windowMs}`;
    const now = Date.now();
    const entry = _rlStore.get(key);
    if (!entry || now > entry.resetAt) { _rlStore.set(key, { count: 1, resetAt: now + windowMs }); return next(); }
    entry.count++;
    if (entry.count > limit) {
      res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: "You're doing that too often. Please wait and try again." });
    }
    return next();
  };
}
const jobCreationLimit    = makeUserRateLimiter(5,  60 * 60 * 1000);  // 5 jobs/hour per user
const locationUpdateLimit = makeUserRateLimiter(30, 60_000);           // 30 location updates/min per provider

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

async function logAudit(action: string, targetType: string, targetId: string, targetName: string, details?: string) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (action, target_type, target_id, target_name, details) VALUES ($1, $2, $3, $4, $5)`,
      [action, targetType, targetId, targetName, details || null]
    );
  } catch {}
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

// ── DB broadcast helpers ──────────────────────────────────────────────────────

let broadcastJobUpdate: (job: JobRecord) => void = () => {};
let broadcastProviderStatus: (providerId: string, isAvailable: boolean) => void = () => {};

// ── Routes ────────────────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Rate limiting: 100 req/min per IP on all /api routes ─────────────────────
  app.use("/api", generalLimit);

  // ── DB column migrations (idempotent) ────────────────────────────────────────
  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS accepts_priority_jobs BOOLEAN DEFAULT FALSE
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS service_radius_miles INT DEFAULT 25
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id           TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id    TEXT NOT NULL,
      sender_role  TEXT,
      content      TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});

  await pool.query(`
    CREATE INDEX IF NOT EXISTS chat_messages_conv_idx ON chat_messages(conversation_id)
  `).catch(() => {});

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      blocker_email TEXT NOT NULL,
      blocked_email TEXT NOT NULL,
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(blocker_email, blocked_email)
    )
  `).catch(() => {});

  await pool.query(`
    CREATE INDEX IF NOT EXISTS blocks_blocker_idx ON blocks(blocker_email)
  `).catch(() => {});

  await pool.query(`
    ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0
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
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS requested_provider_id TEXT DEFAULT NULL`).catch(() => {});
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
  // ── auth_users column migrations ────────────────────────────────────────────
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS search_radius INT DEFAULT 10`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS suspended BOOLEAN DEFAULT FALSE`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      target_name TEXT,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  // ── support conversations ────────────────────────────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_role TEXT,
      user_name TEXT,
      status TEXT DEFAULT 'open',
      admin_taken_over BOOLEAN DEFAULT FALSE,
      messages JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
  // ── providers column migrations ─────────────────────────────────────────────
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS stripe_account_id TEXT DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS fleet_vehicles JSONB DEFAULT '[]'`).catch(() => {});
  await pool.query(`ALTER TABLE providers ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT NULL`).catch(() => {});
  // ── clear stale online status on every server start ──────────────────────────
  // Providers whose last_seen_at is older than 5 min (or NULL) are marked offline
  // so they never appear in the nearby list after a server restart / cold start.
  await pool.query(
    `UPDATE providers SET is_available = false, last_seen_at = NULL
     WHERE is_available = true
       AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')`
  ).catch(() => {});
  // ── jobs column migration ───────────────────────────────────────────────────
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`).catch(() => {});
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS provider_rating SMALLINT DEFAULT NULL`).catch(() => {});

  // ── Performance indexes (CREATE IF NOT EXISTS — safe to run on every start) ──
  // sessions.token: every authenticated request does WHERE token = $1 — critical
  await pool.query(`CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token)`).catch(() => {});
  // sessions.user_id: used by signout and account deletion
  await pool.query(`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`).catch(() => {});
  // sessions.expires_at: used by cleanup and token validation
  await pool.query(`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`).catch(() => {});
  // jobs.status: used by pending job queries and admin filters
  await pool.query(`CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs(status)`).catch(() => {});
  // jobs driver/provider JSONB expression indexes: used by history and job lookup endpoints
  await pool.query(`CREATE INDEX IF NOT EXISTS jobs_driver_id_idx ON jobs((driver->>'id'))`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS jobs_provider_id_idx ON jobs((provider->>'id'))`).catch(() => {});
  // admin_audit_log: ordered by created_at descending
  await pool.query(`CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON admin_audit_log(created_at DESC)`).catch(() => {});
  // support_conversations: ordered by updated_at descending
  await pool.query(`CREATE INDEX IF NOT EXISTS support_conv_updated_idx ON support_conversations(updated_at DESC)`).catch(() => {});

  // ── Expired session cleanup (runs once on startup) ────────────────────────
  pool.query(`DELETE FROM sessions WHERE expires_at < NOW()`).catch(() => {});

  function getSmartcarRedirectUri(): string {
    const prodDomain = process.env.REPLIT_INTERNAL_APP_DOMAIN;
    if (prodDomain) return `https://${prodDomain}/api/smartcar/callback`;
    const devDomain = process.env.REPLIT_DEV_DOMAIN;
    if (devDomain) return `https://${devDomain}:5000/api/smartcar/callback`;
    return "http://localhost:5000/api/smartcar/callback";
  }

  // ── Auth ─────────────────────────────────────────────────────────────────────

  app.post("/api/auth/signup", authLimit, async (req: Request, res: Response) => {
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

  app.post("/api/auth/signin", authLimit, async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    // Account lockout check
    const lockStatus = isAccountLocked(email);
    if (lockStatus.locked) {
      res.setHeader("Retry-After", String(lockStatus.retryAfterSec));
      return res.status(429).json({
        error: `Too many failed attempts. Your account is locked for ${Math.ceil(lockStatus.retryAfterSec / 60)} more minute(s).`,
      });
    }
    try {
      const { rows } = await pool.query<{ id: string; email: string; name: string; phone: string; role: string; password_hash: string }>(
        "SELECT id, email, name, phone, role, password_hash FROM auth_users WHERE email = $1",
        [email.toLowerCase().trim()]
      );
      if (!rows.length) {
        recordFailedLogin(email);
        return res.status(401).json({ error: "Email or password is incorrect" });
      }
      const user = rows[0];
      const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
      if (!valid) {
        recordFailedLogin(email);
        const attempts = (_loginAttempts.get(email.toLowerCase())?.count ?? 1);
        const remaining = Math.max(0, 5 - attempts);
        return res.status(401).json({
          error: remaining > 0
            ? `Email or password is incorrect. ${remaining} attempt(s) remaining before lockout.`
            : "Too many failed attempts. Account locked for 15 minutes.",
        });
      }
      clearLoginAttempts(email);
      // Check if account is suspended
      const { rows: suspendRows } = await pool.query("SELECT suspended FROM auth_users WHERE id = $1", [user.id]);
      if (suspendRows[0]?.suspended) {
        return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
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
      const { rows } = await pool.query(
        "SELECT search_radius, notifications_enabled, emergency_contacts FROM auth_users WHERE id = $1",
        [user.id]
      );
      const prefs = rows[0] || {};
      res.json({
        ...user,
        searchRadius: prefs.search_radius ?? 10,
        notificationsEnabled: prefs.notifications_enabled ?? true,
        emergencyContacts: Array.isArray(prefs.emergency_contacts) ? prefs.emergency_contacts : [],
      });
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

  // ── Forgot / Reset Password ──────────────────────────────────────────────
  const _resetCodes = new Map<string, { code: string; expiry: number }>();

  app.post("/api/auth/forgot-password", authLimit, async (req: Request, res: Response) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = email.toLowerCase().trim();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 15 * 60 * 1000;
    try {
      const { rows } = await pool.query("SELECT id FROM auth_users WHERE email = $1", [normalizedEmail]);
      if (rows.length) {
        _resetCodes.set(normalizedEmail, { code, expiry });
        console.log(`[FORGOT PASSWORD] Reset code for ${normalizedEmail}: ${code}`);
      }
      // Always return same response to prevent email enumeration
      const isDev = process.env.NODE_ENV !== "production";
      res.json({
        success: true,
        message: "If an account with that email exists, a 6-digit reset code has been sent.",
        ...(isDev ? { debug_code: rows.length ? code : null } : {}),
      });
    } catch (err) {
      console.error("[auth/forgot-password]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/auth/reset-password", authLimit, async (req: Request, res: Response) => {
    const { email, code, newPassword } = req.body as { email?: string; code?: string; newPassword?: string };
    if (!email?.trim() || !code?.trim() || !newPassword) {
      return res.status(400).json({ error: "email, code, and newPassword are required" });
    }
    if (newPassword.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    const normalizedEmail = email.toLowerCase().trim();
    const stored = _resetCodes.get(normalizedEmail);
    if (!stored || stored.code !== code.trim() || Date.now() > stored.expiry) {
      return res.status(400).json({ error: "Invalid or expired reset code. Please request a new one." });
    }
    try {
      const newHash = await hashPassword(newPassword);
      const { rowCount } = await pool.query(
        "UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE email = $2",
        [newHash, normalizedEmail]
      );
      if (!rowCount) return res.status(404).json({ error: "Account not found" });
      _resetCodes.delete(normalizedEmail);
      await pool.query("DELETE FROM sessions WHERE user_id IN (SELECT id FROM auth_users WHERE email = $1)", [normalizedEmail]);
      console.log(`[AUTH] password reset for ${normalizedEmail}`);
      res.json({ success: true, message: "Password reset successfully. Please sign in with your new password." });
    } catch (err) {
      console.error("[auth/reset-password]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ── Apple Sign-In ─────────────────────────────────────────────────────────
  app.post("/api/auth/apple-signin", authLimit, async (req: Request, res: Response) => {
    const { appleUserId, email, fullName } = req.body as { appleUserId?: string; email?: string; fullName?: string };
    if (!appleUserId) return res.status(400).json({ error: "Apple user ID is required" });
    try {
      const normalizedEmail = email?.toLowerCase().trim();
      let userId: string | null = null;
      let userName = fullName?.trim() || "ResqRide User";
      let userEmail = normalizedEmail || `apple_${appleUserId}@users.resqride.app`;
      let userPhone = "";

      if (normalizedEmail) {
        const { rows } = await pool.query<{ id: string; name: string; phone: string }>(
          "SELECT id, name, phone FROM auth_users WHERE email = $1", [normalizedEmail]
        );
        if (rows.length) {
          userId = rows[0].id;
          userName = rows[0].name;
          userPhone = rows[0].phone || "";
        }
      }
      if (!userId) {
        userId = `user_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        await pool.query(
          "INSERT INTO auth_users (id, email, password_hash, name, phone, role) VALUES ($1, $2, $3, $4, $5, $6)",
          [userId, userEmail, "APPLE_SSO_" + appleUserId, userName, userPhone, "driver"]
        );
        console.log(`[AUTH] apple-signin new user userId=${userId} email=${userEmail}`);
      } else {
        console.log(`[AUTH] apple-signin existing user userId=${userId}`);
      }
      const token = await createSession(userId);
      res.json({ token, userId, name: userName, email: userEmail, phone: userPhone, role: "driver" });
    } catch (err) {
      console.error("[auth/apple-signin]", err);
      res.status(500).json({ error: "Sign in failed" });
    }
  });

  // ── Delete Account ────────────────────────────────────────────────────────
  app.delete("/api/auth/account", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    try {
      await pool.query("DELETE FROM sessions WHERE user_id = $1", [user.id]);
      await pool.query("DELETE FROM providers WHERE email = $1", [user.email]);
      await pool.query("DELETE FROM auth_users WHERE id = $1", [user.id]);
      console.log(`[AUTH] account deleted userId=${user.id}`);
      res.json({ success: true, message: "Account permanently deleted." });
    } catch (err) {
      console.error("[auth/delete-account]", err);
      res.status(500).json({ error: "Could not delete account" });
    }
  });

  // ── Change Password + session token rotation ────────────────────────────────
  app.patch("/api/auth/password", authLimit, async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    try {
      const { rows } = await pool.query<{ id: string; password_hash: string }>(
        "SELECT id, password_hash FROM auth_users WHERE id = $1", [user.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Account not found" });
      const { valid } = await verifyPassword(currentPassword, rows[0].password_hash);
      if (!valid) {
        recordFailedLogin(user.email);
        return res.status(401).json({ error: "Current password is incorrect" });
      }
      const newHash = await hashPassword(newPassword);
      await pool.query(
        "UPDATE auth_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [newHash, user.id]
      );
      // Session token rotation: invalidate all OTHER sessions so stolen sessions are revoked
      await pool.query(
        "DELETE FROM sessions WHERE user_id = $1 AND token != $2",
        [user.id, token]
      );
      clearLoginAttempts(user.email);
      console.log(`[AUTH] password changed userId=${user.id}`);
      res.json({ success: true, message: "Password updated. All other sessions have been signed out." });
    } catch (err) {
      console.error("[auth/password]", err);
      res.status(500).json({ error: "Database error" });
    }
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

  app.patch("/api/auth/preferences", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"]);
    if (!token) return res.status(401).json({ error: "No token" });
    try {
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { searchRadius, notificationsEnabled, emergencyContacts } = req.body as {
        searchRadius?: number;
        notificationsEnabled?: boolean;
        emergencyContacts?: unknown[];
      };
      await pool.query(
        `UPDATE auth_users SET
           search_radius        = COALESCE($2, search_radius),
           notifications_enabled = COALESCE($3, notifications_enabled),
           emergency_contacts   = COALESCE($4::jsonb, emergency_contacts),
           updated_at           = NOW()
         WHERE id = $1`,
        [
          user.id,
          searchRadius !== undefined ? searchRadius : null,
          notificationsEnabled !== undefined ? notificationsEnabled : null,
          emergencyContacts !== undefined ? JSON.stringify(emergencyContacts) : null,
        ]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("[auth/preferences]", err);
      res.status(500).json({ error: "Failed to save preferences" });
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
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Clear-Site-Data", '"cache"');
      res.send(fs.readFileSync(privacyPage, "utf-8"));
    } else {
      res.status(404).send("Privacy policy not found");
    }
  });

  app.get("/terms", (_req: Request, res: Response) => {
    const termsPage = path.resolve(process.cwd(), "server", "templates", "terms.html");
    if (fs.existsSync(termsPage)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
      res.setHeader("Clear-Site-Data", '"cache"');
      res.send(fs.readFileSync(termsPage, "utf-8"));
    } else {
      res.status(404).send("Terms of Service not found");
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
          earningsBalance: p.earningsBalance ?? 0,
          stripeAccountId: p.stripeAccountId || null,
          evCapable: p.evCapable ?? false,
          serviceRadiusMiles: p.serviceRadiusMiles ?? 25,
          teamMembers: p.teamMembers ?? [],
          fleetVehicles: p.fleetVehicles ?? [],
          businessHours: p.businessHours ?? null,
          createdAt: r.created_at,
        };
      }));
    } catch (err) {
      console.error("[admin/providers]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/approve", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows, rowCount } = await pool.query(
        "UPDATE providers SET verification_status = 'verified', verification_notes = NULL, updated_at = NOW() WHERE id = $1 RETURNING name",
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      logAudit("approve_provider", "provider", req.params.id, rows[0]?.name || req.params.id);
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
      const { rows, rowCount } = await pool.query(
        `UPDATE providers
         SET verification_status = 'not_started',
             verification_notes = $2,
             verification_documents = '{}',
             verification_submitted_at = NULL,
             updated_at = NOW()
         WHERE id = $1 RETURNING name`,
        [req.params.id, noteText]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      logAudit("reject_provider", "provider", req.params.id, rows[0]?.name || req.params.id, noteText);
      res.json({ success: true, verificationStatus: "not_started", notes: noteText });
    } catch (err) {
      console.error("[admin/reject]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/reinstate", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows, rowCount } = await pool.query(
        `UPDATE providers
         SET verification_status = 'not_started',
             verification_notes = 'Account reinstated by admin. Please resubmit your verification documents.',
             verification_documents = '{}',
             verification_submitted_at = NULL,
             updated_at = NOW()
         WHERE id = $1 RETURNING name`,
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      logAudit("reinstate_provider", "provider", req.params.id, rows[0]?.name || req.params.id);
      res.json({ success: true, verificationStatus: "not_started" });
    } catch (err) {
      console.error("[admin/reinstate]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/revoke", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows, rowCount } = await pool.query(
        `UPDATE providers SET verification_status = 'revoked',
             verification_notes = 'Verification revoked by admin.', updated_at = NOW()
         WHERE id = $1 RETURNING name`,
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      logAudit("revoke_provider", "provider", req.params.id, rows[0]?.name || req.params.id);
      res.json({ success: true, verificationStatus: "revoked" });
    } catch (err) {
      console.error("[admin/revoke]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/admin/providers/:id/suspend", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "UPDATE providers SET verification_status = 'suspended', updated_at = NOW() WHERE id = $1 RETURNING id, name",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      logAudit("suspend_provider", "provider", rows[0].id, rows[0].name);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/admin/providers/:id/unsuspend", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "UPDATE providers SET verification_status = 'not_started', updated_at = NOW() WHERE id = $1 RETURNING id, name",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Provider not found" });
      logAudit("unsuspend_provider", "provider", rows[0].id, rows[0].name);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Admin: users ──────────────────────────────────────────────────────────────

  app.get("/api/admin/users", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.stripe_customer_id, u.push_token, u.suspended, u.created_at,
                CASE WHEN p.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_provider_profile,
                p.verification_status AS provider_verification_status
         FROM auth_users u
         LEFT JOIN providers p ON p.id = u.id
         ORDER BY u.created_at DESC`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/admin/users/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      await pool.query("DELETE FROM sessions WHERE user_id = $1", [req.params.id]);
      const { rows, rowCount } = await pool.query("DELETE FROM auth_users WHERE id = $1 RETURNING name", [req.params.id]);
      if (!rowCount) return res.status(404).json({ error: "User not found" });
      logAudit("delete_user", "user", req.params.id, rows[0]?.name || req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/users/:id/suspend", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "UPDATE auth_users SET suspended = TRUE WHERE id = $1 RETURNING id, name",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "User not found" });
      await pool.query("DELETE FROM sessions WHERE user_id = $1", [req.params.id]);
      logAudit("suspend_user", "user", rows[0].id, rows[0].name);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.post("/api/admin/users/:id/unsuspend", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "UPDATE auth_users SET suspended = FALSE WHERE id = $1 RETURNING id, name",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "User not found" });
      logAudit("unsuspend_user", "user", rows[0].id, rows[0].name);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Admin: jobs ───────────────────────────────────────────────────────────────

  app.get("/api/admin/jobs", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, service_type, status, estimated_cost, total_cost, tip,
                driver, provider, created_at, is_express, is_ev, is_emergency,
                receipt_number, location, requested_provider_id
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
      logAudit("cancel_job", "job", id, `Job ${id.slice(0, 8)}`);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: refund a job ───────────────────────────────────────────────────────
  app.post("/api/admin/jobs/:id/refund", adminAuth, async (req: Request, res: Response) => {
    const { amount, paymentIntentId } = req.body as { amount?: number; paymentIntentId?: string };
    try {
      const { rows } = await pool.query(
        "SELECT id, stripe_payment_intent_id, total_cost, estimated_cost FROM jobs WHERE id = $1",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      const job = rows[0];
      const piId = paymentIntentId?.trim() || job.stripe_payment_intent_id;
      if (!piId) return res.status(400).json({ error: "No Stripe Payment Intent ID found for this job. Enter it manually." });
      const refundParams: Record<string, unknown> = { payment_intent: piId };
      if (amount && amount > 0) refundParams.amount = Math.round(amount * 100);
      const refund = await stripe.refunds.create(refundParams as Parameters<typeof stripe.refunds.create>[0]);
      logAudit("refund_job", "job", job.id, `Job ${job.id.slice(0,8)}`, `$${(refund.amount / 100).toFixed(2)} refunded via ${piId}`);
      res.json({ ok: true, refundId: refund.id, amount: refund.amount / 100 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: revenue chart (last 30 days) ───────────────────────────────────────
  app.get("/api/admin/revenue-chart", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(`
        SELECT
          DATE(created_at AT TIME ZONE 'UTC') as day,
          COALESCE(SUM(service_fee), 0)::float as revenue,
          COALESCE(SUM(total_cost), 0)::float as volume,
          COUNT(*)::int as jobs,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed
        FROM jobs
        WHERE created_at > NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day ASC
      `);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Admin: audit log ──────────────────────────────────────────────────────────
  app.get("/api/admin/audit-log", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(`SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 300`);
      res.json(rows);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
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

  // ── Blocks ────────────────────────────────────────────────────────────────────

  app.post("/api/blocks", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"] as string | undefined);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const { blockedEmail } = req.body as { blockedEmail?: string };
    if (!blockedEmail) return res.status(400).json({ error: "blockedEmail is required" });
    try {
      await pool.query(
        `INSERT INTO blocks (id, blocker_email, blocked_email)
         VALUES (gen_random_uuid()::text, $1, $2) ON CONFLICT DO NOTHING`,
        [user.email.toLowerCase(), blockedEmail.toLowerCase()]
      );
      res.json({ success: true });
    } catch (err) {
      console.error("[blocks/create]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/blocks", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"] as string | undefined);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    try {
      const { rows } = await pool.query<{ id: string; blocked_email: string; created_at: string }>(
        "SELECT id, blocked_email, created_at FROM blocks WHERE blocker_email = $1 ORDER BY created_at DESC",
        [user.email.toLowerCase()]
      );
      res.json({ blocks: rows.map((r) => ({ id: r.id, blockedEmail: r.blocked_email, createdAt: r.created_at })) });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.delete("/api/blocks/:id", async (req: Request, res: Response) => {
    const token = extractToken(req.headers["authorization"] as string | undefined);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    try {
      await pool.query("DELETE FROM blocks WHERE id = $1 AND blocker_email = $2", [req.params.id, user.email.toLowerCase()]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // ── Chat history ──────────────────────────────────────────────────────────────

  app.get("/api/chat/:conversationId/messages", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{
        id: string; conversation_id: string; sender_id: string;
        sender_role: string; content: string; created_at: string;
      }>(
        "SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200",
        [req.params.conversationId]
      );
      const messages = rows.map((r) => ({
        id: r.id,
        conversationId: r.conversation_id,
        senderId: r.sender_id,
        senderRole: r.sender_role as "driver" | "provider" | null,
        content: r.content,
        timestamp: r.created_at,
      }));
      // Merge with any in-memory messages not yet flushed
      const memHistory = messageHistory.get(req.params.conversationId) || [];
      const persisted = new Set(messages.map((m) => m.id));
      const merged = [...messages, ...memHistory.filter((m) => !persisted.has(m.id))]
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .slice(-200);
      res.json({ messages: merged });
    } catch {
      const history = messageHistory.get(req.params.conversationId) || [];
      res.json({ messages: history });
    }
  });

  // ── Providers: nearby & register ─────────────────────────────────────────────

  app.get("/api/providers/nearby", async (req: Request, res: Response) => {
    const { lat, lng, radius } = req.query as Record<string, string>;
    const maxRadius = parseFloat(radius || "25");
    try {
      // Bidirectional block filtering: exclude providers blocked by or blocking this driver
      const authHeader = req.headers["authorization"] as string | undefined;
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
      let blockedEmails = new Set<string>();
      if (token) {
        const { rows: uRows } = await pool.query<{ email: string }>(
          `SELECT u.email FROM sessions s JOIN auth_users u ON u.id = s.user_id
           WHERE s.token = $1 AND s.expires_at > NOW()`, [token]
        ).catch(() => ({ rows: [] }));
        const driverEmail = uRows[0]?.email;
        if (driverEmail) {
          const { rows: bRows } = await pool.query<{ email: string }>(
            `SELECT blocked_email AS email FROM blocks WHERE blocker_email = $1
             UNION
             SELECT blocker_email  AS email FROM blocks WHERE blocked_email = $1`,
            [driverEmail.toLowerCase()]
          ).catch(() => ({ rows: [] }));
          blockedEmails = new Set(bRows.map((r) => r.email.toLowerCase()));
        }
      }

      const { rows } = await pool.query<ProviderRow>(
        `SELECT * FROM providers
         WHERE is_available = true
           AND last_seen_at > NOW() - INTERVAL '5 minutes'`
      );
      // Check which providers have an active (non-terminal) job
      const { rows: activeJobs } = await pool.query<{ provider_id: string }>(
        `SELECT provider->>'id' AS provider_id FROM jobs
         WHERE status NOT IN ('completed', 'cancelled') AND provider IS NOT NULL`
      );
      const busyIds = new Set(activeJobs.map((j) => j.provider_id).filter(Boolean));

      let result = rows
        .filter((row) => blockedEmails.size === 0 || !blockedEmails.has((row.email || "").toLowerCase()))
        .map((row) => ({
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
            const providerRadius = (p as ProviderRecord & { serviceRadiusMiles?: number }).serviceRadiusMiles ?? 25;
            // Respect both the caller's max radius and the provider's own service radius
            return d === null || d <= Math.min(maxRadius, providerRadius);
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
           provider_type = EXCLUDED.provider_type,
           badges = EXCLUDED.badges,
           location = EXCLUDED.location,
           last_location_update = EXCLUDED.last_location_update,
           push_token = EXCLUDED.push_token,
           ev_capable = EXCLUDED.ev_capable,
           ev_services = EXCLUDED.ev_services,
           accepts_priority_jobs = EXCLUDED.accepts_priority_jobs,
           updated_at = NOW()
           -- NOTE: is_available and last_seen_at are intentionally NOT updated here.
           -- is_available is controlled only by /api/providers/:id/availability.
           -- last_seen_at is controlled only by /api/providers/:id/heartbeat and location patches.
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

  app.patch("/api/providers/:id/location", locationUpdateLimit, async (req: Request, res: Response) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET location = $2, last_location_update = $3, last_seen_at = NOW(), updated_at = NOW() WHERE id = $1",
        [req.params.id, JSON.stringify({ latitude, longitude }), new Date().toISOString()]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[providers/location]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  // Heartbeat — called periodically by online providers to prove they're still active
  app.patch("/api/providers/:id/heartbeat", async (req: Request, res: Response) => {
    try {
      await pool.query(
        "UPDATE providers SET last_seen_at = NOW(), updated_at = NOW() WHERE id = $1",
        [req.params.id]
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("[providers/heartbeat]", err);
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
        `UPDATE providers SET is_available = $2, updated_at = NOW()${isAvailable ? ", last_seen_at = NOW()" : ""} WHERE id = $1`,
        [req.params.id, isAvailable]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      broadcastProviderStatus(req.params.id, isAvailable);
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

  app.patch("/api/providers/:id/business-data", async (req: Request, res: Response) => {
    const { teamMembers, fleetVehicles, businessHours } = req.body as {
      teamMembers?: unknown;
      fleetVehicles?: unknown;
      businessHours?: unknown;
    };
    try {
      const updates: string[] = [];
      const values: unknown[] = [req.params.id];
      if (teamMembers !== undefined) { values.push(JSON.stringify(teamMembers)); updates.push(`team_members = $${values.length}`); }
      if (fleetVehicles !== undefined) { values.push(JSON.stringify(fleetVehicles)); updates.push(`fleet_vehicles = $${values.length}`); }
      if (businessHours !== undefined) { values.push(JSON.stringify(businessHours)); updates.push(`business_hours = $${values.length}`); }
      if (updates.length === 0) return res.status(400).json({ error: "Nothing to update" });
      await pool.query(
        `UPDATE providers SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $1`,
        values
      );
      res.json({ success: true });
    } catch (err: any) {
      console.error("[providers/business-data]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.patch("/api/providers/:id/service-radius", async (req: Request, res: Response) => {
    const { serviceRadiusMiles } = req.body as { serviceRadiusMiles?: number };
    const miles = Number(serviceRadiusMiles);
    if (!miles || miles < 1 || miles > 200) {
      return res.status(400).json({ error: "serviceRadiusMiles must be between 1 and 200" });
    }
    try {
      const { rowCount } = await pool.query(
        "UPDATE providers SET service_radius_miles = $2, updated_at = NOW() WHERE id = $1",
        [req.params.id, miles]
      );
      if (!rowCount) return res.status(404).json({ error: "Provider not found" });
      res.json({ success: true, serviceRadiusMiles: miles });
    } catch (err) {
      console.error("[providers/service-radius]", err);
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

  // ── Completed jobs for provider analytics ─────────────────────────────────
  app.get("/api/providers/:id/completed-jobs", async (req: Request, res: Response) => {
    try {
      // Auth: verify the Bearer token belongs to the provider being queried
      const token = extractToken(req.headers["authorization"] as string | undefined);
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      // Look up the provider account linked to this auth user by email
      const { rows: provRows } = await pool.query<{ id: string }>(
        "SELECT id FROM providers WHERE email = $1",
        [user.email]
      );
      const ownedProviderId = provRows[0]?.id;

      // Reject if the token's provider doesn't match the requested :id
      if (!ownedProviderId || ownedProviderId !== req.params.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { rows } = await pool.query(
        `SELECT id, service_type, status, total_cost, tip, estimated_cost, created_at, is_ev, is_emergency
         FROM jobs
         WHERE provider->>'id' = $1 AND status = 'completed'
         ORDER BY created_at DESC
         LIMIT 500`,
        [req.params.id]
      );
      res.json(rows);
    } catch (err) {
      console.error("[completed-jobs GET]", err);
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

  app.post("/api/jobs", jobCreationLimit, async (req: Request, res: Response) => {
    const data = req.body as Partial<JobRecord>;
    if (!data.id || !data.serviceType) return res.status(400).json({ error: "id and serviceType required" });
    const requestedProviderId: string | null = (data as any).requestedProviderId ?? null;
    console.log(`[jobs POST] received id=${data.id} type=${data.serviceType} status=${(data as any).status ?? "pending"} requestedProviderId=${requestedProviderId ?? "none"}`);
    // Detect EV job: explicit flag or notes convention ("EV " prefix)
    const isEV = data.isEV ?? (typeof data.notes === "string" && data.notes.startsWith("EV "));
    try {
      // Embed driver's historical avg rating (from provider_rating on past jobs)
      let driverData: Record<string, unknown> | null = data.driver ? { ...(data.driver as Record<string, unknown>) } : null;
      if (driverData?.id) {
        try {
          const { rows: rr } = await pool.query(
            `SELECT AVG(provider_rating)::numeric(3,2) AS avg, COUNT(*) AS cnt
             FROM jobs WHERE driver->>'id' = $1 AND provider_rating IS NOT NULL`,
            [driverData.id]
          );
          if (rr[0] && Number(rr[0].cnt) > 0) {
            driverData.avgRating = Number(rr[0].avg);
            driverData.ratingCount = Number(rr[0].cnt);
          }
        } catch { /* non-critical */ }
      }

      const { rows } = await pool.query<JobRow>(
        `INSERT INTO jobs (
           id, service_type, location, notes, status, estimated_cost,
           driver, eta, is_express, express_fee, service_fee, total_cost,
           receipt_number, time_saved, created_at, is_emergency, is_ev,
           requested_provider_id
         ) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO NOTHING
         RETURNING *`,
        [
          data.id, data.serviceType,
          JSON.stringify(data.location ?? { address: "Unknown", latitude: 0, longitude: 0 }),
          data.notes ?? "", data.estimatedCost ?? 0,
          driverData ? JSON.stringify(driverData) : null,
          data.eta ?? null, data.isExpress ?? null,
          data.expressFee ?? null, data.serviceFee ?? null,
          data.totalCost ?? null, data.receiptNumber ?? null,
          data.timeSaved ?? null,
          data.createdAt ?? new Date().toISOString(),
          data.isEmergency ?? null,
          isEV,
          requestedProviderId,
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

      // ── Push notifications ────────────────────────────────────────────────
      // If a specific provider was requested, notify only them (direct request).
      // Otherwise broadcast to all available/matching providers.
      const serviceLabels: Record<string, string> = {
        flat_tire: "Flat Tire", jump_start: "Jump Start", tow: "Tow Service",
        fuel: "Fuel Delivery", lockout: "Lockout", obd_diagnostic: "OBD Diagnostic",
        tire_replacement: "Tire Replacement", mobile_inflation: "Mobile Tire Inflation",
        tire_check: "Tire Inspection", battery_check: "Battery Check",
      };
      // Sub-service → parent mapping for provider capability matching
      const subToParent: Record<string, string> = {
        tire_replacement: "flat_tire", mobile_inflation: "flat_tire",
        tire_check: "flat_tire", battery_check: "jump_start",
      };
      const baseLabel = serviceLabels[job.serviceType] || "Roadside Assistance";
      const serviceLabel = isEV
        ? (job.serviceType === "fuel" ? "EV Mobile Charging" : "EV-Safe Towing")
        : baseLabel;

      if (requestedProviderId) {
        // Direct request — push only to the targeted provider
        const { rows: targeted } = await pool.query<ProviderRow>(
          "SELECT push_token FROM providers WHERE id = $1 AND push_token IS NOT NULL",
          [requestedProviderId]
        );
        const token = targeted[0]?.push_token as string | undefined;
        if (token) {
          console.log(`[PUSH] Direct request → provider ${requestedProviderId}`);
          fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify([{
              to: token,
              title: "You Were Specifically Requested!",
              body: `A driver is requesting you directly for ${serviceLabel} — ~$${Math.round((job.totalCost ?? job.estimatedCost ?? 0) * 0.85)} payout. Tap to accept.`,
              data: { screen: "ProviderJobs" },
              sound: "default",
              priority: "high",
              channelId: "default",
            }]),
          }).catch((err) => console.error("[PUSH] Failed:", err));
        }
      } else {
        // General broadcast — available providers who offer this service type (or its parent)
        const parentService = subToParent[job.serviceType] ?? job.serviceType;
        const providerQuery = isEV
          ? "SELECT push_token FROM providers WHERE is_available = true AND ev_capable = true AND push_token IS NOT NULL"
          : `SELECT push_token FROM providers WHERE is_available = true AND push_token IS NOT NULL AND (services_offered::text LIKE '%"${job.serviceType}"%' OR services_offered::text LIKE '%"${parentService}"%')`;
        const { rows: providers } = await pool.query<ProviderRow>(providerQuery);
        const tokens = providers.map((p) => p.push_token as string).filter(Boolean);
        if (tokens.length > 0) {
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
      }

      res.json(job);
    } catch (err) {
      console.error("[jobs POST]", err);
      res.status(500).json({ error: "Database error" });
    }
  });

  app.get("/api/jobs/pending", async (req: Request, res: Response) => {
    const providerId = (req.query.providerId as string | undefined) ?? null;
    try {
      // Auto-expire jobs older than 30 minutes so stale requests never linger
      await pool.query(
        "UPDATE jobs SET status = 'expired' WHERE status = 'pending' AND created_at::timestamptz < NOW() - INTERVAL '30 minutes'"
      ).catch(() => {});
      // A provider sees:
      //   1. Jobs with no specific target (open to anyone), OR
      //   2. Jobs explicitly directed at them
      // If no providerId is supplied (unauthenticated or legacy call), return only open jobs.
      const { rows } = providerId
        ? await pool.query<JobRow>(
            `SELECT * FROM jobs
             WHERE status = 'pending'
               AND (requested_provider_id IS NULL OR requested_provider_id = $1)
             ORDER BY
               CASE WHEN requested_provider_id = $1 THEN 0 ELSE 1 END,
               created_at ASC`,
            [providerId]
          )
        : await pool.query<JobRow>(
            "SELECT * FROM jobs WHERE status = 'pending' AND requested_provider_id IS NULL ORDER BY created_at ASC"
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

  // ── Driver job history (must be before /:id to avoid wildcard capture) ────────
  app.get("/api/jobs/driver/:driverId", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<JobRow>(
        `SELECT * FROM jobs WHERE driver->>'id' = $1 ORDER BY created_at DESC LIMIT 200`,
        [req.params.driverId]
      );
      res.set("Cache-Control", "no-store");
      res.json(rows.map(rowToJob));
    } catch (err) {
      console.error("[jobs/driver]", err);
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
      // Guard: if this is a direct request, only the intended provider may accept
      const jobCheck = await pool.query<{ requested_provider_id: string | null; status: string }>(
        "SELECT requested_provider_id, status FROM jobs WHERE id = $1",
        [jobId]
      );
      if (!jobCheck.rows.length) return res.status(404).json({ error: "Job not found" });
      if (jobCheck.rows[0].status !== "pending") return res.status(409).json({ error: "Job already taken" });
      const intendedProvider = jobCheck.rows[0].requested_provider_id;
      if (intendedProvider) {
        const acceptingId = req.body.provider?.id as string | undefined;
        if (!acceptingId || acceptingId !== intendedProvider) {
          return res.status(403).json({ error: "This job was sent directly to another provider" });
        }
      }

      // Provider fraud / suspension check — block suspended accounts from accepting
      const acceptingProviderId = req.body.provider?.id as string | undefined;
      if (acceptingProviderId) {
        const { rows: pCheck } = await pool.query<{ verification_status: string; email: string }>(
          "SELECT verification_status, email FROM providers WHERE id = $1",
          [acceptingProviderId]
        );
        if (pCheck.length && pCheck[0].verification_status === "suspended") {
          console.warn(`[FRAUD] Suspended provider ${acceptingProviderId} attempted to accept job ${jobId}`);
          return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
        }
        if (pCheck.length && !["verified", "pending", "not_started"].includes(pCheck[0].verification_status ?? "")) {
          console.warn(`[FRAUD] Provider ${acceptingProviderId} with status "${pCheck[0].verification_status}" accepting job`);
        }
      }

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
    // Ownership check — only the driver who created the job may cancel it
    const authToken = extractToken(req.headers["authorization"] as string | undefined);
    const user = authToken ? await getUserByToken(authToken) : null;
    if (!user) return res.status(401).json({ error: "Authentication required" });
    try {
      const check = await pool.query<{ status: string; created_at: string; driver_email: string }>(
        "SELECT status, created_at, driver->>'email' AS driver_email FROM jobs WHERE id = $1",
        [req.params.id]
      );
      if (!check.rows.length) return res.status(404).json({ error: "Job not found" });
      const { status, created_at, driver_email } = check.rows[0];
      if (driver_email && driver_email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ error: "You do not have permission to cancel this job" });
      }
      if (["completed", "cancelled", "expired"].includes(status)) {
        return res.status(409).json({ error: "Job already ended" });
      }

      // Cancellation fee policy: free if cancelled within 2 min AND still pending
      const ageMs = Date.now() - new Date(created_at).getTime();
      const providerAssigned = !["pending", "expired"].includes(status);
      const cancellationFee = (ageMs > 2 * 60 * 1000 || providerAssigned) ? 5 : 0;

      const { rows } = await pool.query<JobRow>(
        "UPDATE jobs SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      const job = rowToJob(rows[0]);

      // Notify provider if they were assigned
      const provId = (job.provider as Record<string, unknown> | undefined)?.id as string | undefined;
      if (provId) {
        const { rows: pr } = await pool.query<{ push_token: string }>(
          "SELECT push_token FROM providers WHERE id = $1 AND push_token IS NOT NULL", [provId]
        );
        if (pr[0]?.push_token) {
          sendPush([pr[0].push_token], "Job Cancelled", "The driver cancelled this request.", { screen: "ProviderTabs" });
        }
      }

      res.json({ ...job, cancellationFee });
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

  app.patch("/api/jobs/:id/provider-rating", async (req: Request, res: Response) => {
    const { rating } = req.body as { rating?: number };
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Rating must be 1-5" });
    try {
      const { rows } = await pool.query<JobRow>(
        "UPDATE jobs SET provider_rating = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
        [req.params.id, rating]
      );
      if (!rows.length) return res.status(404).json({ error: "Job not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[provider-rating]", err);
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
  // In-memory cache keyed by zip code; entries expire after 24 h
  const evChargerCache = new Map<string, { ts: number; data: unknown[] }>();
  const EV_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  app.get("/api/ev/chargers", async (req: Request, res: Response) => {
    const { lat, lon } = req.query as { lat?: string; lon?: string };
    if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    // Step 1: Reverse geocode lat/lon → zip code via Nominatim (free, no key)
    // Step 2: Query NREL AFDC with zip code (lat/lon params are ignored by NREL DEMO_KEY)
    function haversineMi(lat1: number, lon1: number, lat2: number, lon2: number): number {
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
      return 3959 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    try {
      // --- Reverse geocode to get zip code ---
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const geoRes = await fetch(nominatimUrl, {
        headers: { "User-Agent": "ResqRide/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!geoRes.ok) throw new Error(`Nominatim ${geoRes.status}`);
      const geoJson = await geoRes.json() as { address?: { postcode?: string } };
      const zipCode = geoJson.address?.postcode?.split("-")[0];
      if (!zipCode) throw new Error("Could not determine zip code from coordinates");

      // --- Return cached result if still fresh ---
      const cached = evChargerCache.get(zipCode);
      if (cached && Date.now() - cached.ts < EV_CACHE_TTL_MS) {
        // Re-sort by distance from the current position (may differ within same zip)
        const sorted = [...cached.data].map((s: any) => ({
          ...s,
          distanceMi: haversineMi(latNum, lonNum, s.latitude, s.longitude),
          distance: (() => {
            const d = haversineMi(latNum, lonNum, s.latitude, s.longitude);
            return d < 0.1 ? "< 0.1 mi" : `${d.toFixed(1)} mi`;
          })(),
        })).sort((a: any, b: any) => a.distanceMi - b.distanceMi);
        console.log(`[ev/chargers] cache hit zip=${zipCode} → ${sorted.length} stations`);
        return res.json(sorted);
      }

      // --- Fetch EV stations from NREL by zip ---
      const nrelUrl = new URL("https://developer.nrel.gov/api/alt-fuel-stations/v1.json");
      nrelUrl.searchParams.set("api_key", "DEMO_KEY");
      nrelUrl.searchParams.set("fuel_type", "ELEC");
      nrelUrl.searchParams.set("zip", zipCode);
      nrelUrl.searchParams.set("radius", "20.0");
      nrelUrl.searchParams.set("limit", "50");
      nrelUrl.searchParams.set("status", "E");

      const nrelRes = await fetch(nrelUrl.toString(), {
        headers: { "User-Agent": "ResqRide/1.0" },
        signal: AbortSignal.timeout(12000),
      });

      if (!nrelRes.ok) {
        // If rate-limited but we have stale cache, serve it rather than failing
        if (cached) {
          console.log(`[ev/chargers] NREL rate-limited, serving stale cache for zip=${zipCode}`);
          return res.json(cached.data);
        }
        throw new Error(`NREL ${nrelRes.status}`);
      }

      const nrelJson = await nrelRes.json() as {
        error?: { code: string; message: string };
        fuel_stations: Array<{
          id: number;
          station_name: string;
          street_address: string;
          city: string;
          state: string;
          latitude: number;
          longitude: number;
          ev_level2_evse_num: number | null;
          ev_dc_fast_num: number | null;
          ev_network: string | null;
        }>;
      };

      // Handle API-level errors (e.g. OVER_RATE_LIMIT)
      if (nrelJson.error) {
        if (cached) {
          console.log(`[ev/chargers] NREL error "${nrelJson.error.code}", serving stale cache for zip=${zipCode}`);
          return res.json(cached.data);
        }
        throw new Error(`NREL error: ${nrelJson.error.code}`);
      }

      const chargers = (nrelJson.fuel_stations ?? [])
        .map((s) => {
          const distMi = haversineMi(latNum, lonNum, s.latitude, s.longitude);
          const l2 = s.ev_level2_evse_num ?? 0;
          const dcFast = s.ev_dc_fast_num ?? 0;
          const total = Math.max(l2 + dcFast, 1);
          const isFast = dcFast > 0;
          const address = [s.street_address, s.city, s.state].filter(Boolean).join(", ");
          return {
            id: String(s.id),
            name: s.station_name || "Charging Station",
            address,
            latitude: s.latitude,
            longitude: s.longitude,
            distanceMi: distMi,
            distance: distMi < 0.1 ? "< 0.1 mi" : `${distMi.toFixed(1)} mi`,
            chargerCount: total,
            available: total,
            speed: isFast ? "DC Fast" : "Level 2",
            network: s.ev_network || "Unknown",
            pricePerKwh: "Varies",
          };
        })
        .filter((s) => s.distanceMi <= 20)
        .sort((a, b) => a.distanceMi - b.distanceMi);

      // Store in cache (store without distanceMi so it can be recalculated per request)
      evChargerCache.set(zipCode, { ts: Date.now(), data: chargers });
      console.log(`[ev/chargers] zip=${zipCode} lat=${lat} lon=${lon} → ${chargers.length} stations (cached)`);
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
      const { message, history, conversationId, userId, userRole, userName } = req.body as {
        message: string;
        history?: Array<{ role: "user" | "assistant"; content: string }>;
        conversationId?: string;
        userId?: string;
        userRole?: string;
        userName?: string;
      };
      if (!message) return res.status(400).json({ error: "message required" });

      const now = new Date().toISOString();
      const userMsg = { role: "user", content: message, ts: now, fromAdmin: false };

      // Upsert conversation in DB
      let convId = conversationId;
      let adminTakenOver = false;

      if (convId) {
        // Load existing conversation to check admin_taken_over
        const { rows } = await pool.query(
          "SELECT admin_taken_over, messages FROM support_conversations WHERE id = $1",
          [convId]
        );
        if (rows.length > 0) {
          adminTakenOver = rows[0].admin_taken_over;
          // Append user message
          const msgs = [...(rows[0].messages || []), userMsg];
          await pool.query(
            "UPDATE support_conversations SET messages = $1, updated_at = NOW() WHERE id = $2",
            [JSON.stringify(msgs), convId]
          );
        } else {
          // Conversation not found, create it
          convId = `conv-${Date.now()}`;
          await pool.query(
            "INSERT INTO support_conversations (id, user_id, user_role, user_name, messages) VALUES ($1,$2,$3,$4,$5)",
            [convId, userId || null, userRole || null, userName || null, JSON.stringify([userMsg])]
          );
        }
      } else {
        // New conversation
        convId = `conv-${Date.now()}`;
        await pool.query(
          "INSERT INTO support_conversations (id, user_id, user_role, user_name, messages) VALUES ($1,$2,$3,$4,$5)",
          [convId, userId || null, userRole || null, userName || null, JSON.stringify([userMsg])]
        );
      }

      // If admin has taken over, don't call AI — user waits for admin reply
      if (adminTakenOver) {
        return res.json({ reply: null, conversationId: convId, waitingForAgent: true });
      }

      // Call AI
      const aiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
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
        model: "gpt-4o", messages: aiMessages, max_tokens: 250,
      });
      const reply = response.choices[0]?.message?.content ||
        "I couldn't process your message right now. Please call 1-800-SERVICE for immediate assistance.";

      // Save AI reply to conversation
      const aiMsg = { role: "assistant", content: reply, ts: new Date().toISOString(), fromAdmin: false };
      await pool.query(
        `UPDATE support_conversations SET messages = messages || $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify([aiMsg]), convId]
      );

      res.json({ reply, conversationId: convId, waitingForAgent: false });
    } catch (error) {
      console.error("[Support chat error]", error);
      res.status(500).json({ error: "Support chat unavailable" });
    }
  });

  // ── Support conversation polling (client fetches new messages) ────────────────
  app.get("/api/support/conversation/:id", async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "SELECT id, messages, admin_taken_over, status FROM support_conversations WHERE id = $1",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err) {
      res.status(500).json({ error: "DB error" });
    }
  });

  // ── User: list own conversation history ──────────────────────────────────────
  app.get("/api/support/conversations", async (req: Request, res: Response) => {
    try {
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error: "Unauthorized" });
      const user = await getUserByToken(token);
      if (!user) return res.status(401).json({ error: "Unauthorized" });
      const { rows } = await pool.query(
        `SELECT id, status, admin_taken_over, created_at, updated_at,
                messages->-1 AS last_message,
                jsonb_array_length(messages) AS message_count
         FROM support_conversations
         WHERE user_id = $1
         ORDER BY updated_at DESC
         LIMIT 30`,
        [String(user.id)]
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: list support chats ─────────────────────────────────────────────────
  app.get("/api/admin/support-chats", adminAuth, async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, user_id, user_role, user_name, status, admin_taken_over,
                jsonb_array_length(messages) AS message_count, created_at, updated_at
         FROM support_conversations ORDER BY updated_at DESC LIMIT 200`
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: get single support chat ────────────────────────────────────────────
  app.get("/api/admin/support-chats/:id", adminAuth, async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM support_conversations WHERE id = $1",
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json(rows[0]);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: reply to support chat ──────────────────────────────────────────────
  app.post("/api/admin/support-chats/:id/reply", adminAuth, async (req: Request, res: Response) => {
    const { message } = req.body as { message: string };
    if (!message) return res.status(400).json({ error: "message required" });
    try {
      const adminMsg = { role: "assistant", content: message, ts: new Date().toISOString(), fromAdmin: true };
      await pool.query(
        `UPDATE support_conversations
         SET messages = messages || $1::jsonb, admin_taken_over = TRUE, status = 'open', updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify([adminMsg]), req.params.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin: update support chat status ─────────────────────────────────────────
  app.patch("/api/admin/support-chats/:id/status", adminAuth, async (req: Request, res: Response) => {
    const { status, adminTakenOver } = req.body as { status?: string; adminTakenOver?: boolean };
    try {
      await pool.query(
        `UPDATE support_conversations SET
           status = COALESCE($1, status),
           admin_taken_over = COALESCE($2, admin_taken_over),
           updated_at = NOW()
         WHERE id = $3`,
        [status ?? null, adminTakenOver ?? null, req.params.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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

  broadcastProviderStatus = (providerId: string, isAvailable: boolean) => {
    const data = JSON.stringify({ type: "provider_status_update", providerId, isAvailable });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    });
  };

  wss.on("connection", (ws: WebSocket) => {
    let clientRecord: WsClient | null = null;

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === "join") {
          const { conversationId, senderId, senderRole, isNotifier, token } = data;

          // WebSocket authentication: validate token before allowing chat access
          const validateAuth: Promise<boolean> = token
            ? pool.query<{ user_id: string }>(
                "SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()",
                [token as string]
              ).then((r) => r.rows.length > 0).catch(() => false)
            : Promise.resolve(false);

          validateAuth.then((isValid) => {
            if (!isValid) {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Authentication required for chat" }));
                ws.close(1008, "Unauthorized");
              }
              return;
            }
            clientRecord = { ws, conversationId, senderId, senderRole, isNotifier: !!isNotifier };
            clients.add(clientRecord);
            // Load persisted history from DB, merge with in-memory cache
            pool.query<{
              id: string; conversation_id: string; sender_id: string;
              sender_role: string; content: string; created_at: string;
            }>(
              "SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200",
              [conversationId]
            ).then((result) => {
              const dbMessages = result.rows.map((r) => ({
                id: r.id,
                conversationId: r.conversation_id,
                senderId: r.sender_id,
                senderRole: r.sender_role as "driver" | "provider" | null,
                content: r.content,
                timestamp: r.created_at,
              }));
              const memHistory = messageHistory.get(conversationId) || [];
              const persisted = new Set(dbMessages.map((m) => m.id));
              const merged = [...dbMessages, ...memHistory.filter((m) => !persisted.has(m.id))]
                .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
                .slice(-200);
              messageHistory.set(conversationId, merged);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "history", messages: merged }));
              }
            }).catch(() => {
              const history = messageHistory.get(conversationId) || [];
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "history", messages: history }));
              }
            });
          }).catch(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "error", code: "SERVER_ERROR" }));
            }
          });
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

          // Persist to DB (fire-and-forget)
          pool.query(
            "INSERT INTO chat_messages (id, conversation_id, sender_id, sender_role, content) VALUES ($1,$2,$3,$4,$5)",
            [message.id, conversationId, senderId, senderRole || null, content]
          ).catch((err) => console.error("[chat persist]", err));

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
              // Persist auto-reply to DB too
              pool.query(
                "INSERT INTO chat_messages (id, conversation_id, sender_id, sender_role, content) VALUES ($1,$2,$3,$4,$5)",
                [autoReply.id, conversationId, autoReply.senderId, autoReply.senderRole || null, autoReply.content]
              ).catch(() => {});
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

  // ── Job timeout: auto-cancel jobs stuck for 45+ minutes ──────────────────────
  setInterval(async () => {
    try {
      const { rows: stuckJobs } = await pool.query<{
        id: string; driver: Record<string, unknown> | null; provider: Record<string, unknown> | null;
      }>(
        `UPDATE jobs SET status = 'cancelled', updated_at = NOW()
         WHERE status IN ('accepted', 'en_route', 'arrived', 'in_progress')
           AND updated_at < NOW() - INTERVAL '45 minutes'
         RETURNING id,
           (driver)::text AS driver,
           (provider)::text AS provider`
      );
      for (const job of stuckJobs) {
        console.log(`[JOB TIMEOUT] auto-cancelled stuck job ${job.id}`);
        // Notify driver
        const driverObj = typeof job.driver === "string" ? JSON.parse(job.driver) : job.driver;
        const driverEmail = driverObj?.email as string | undefined;
        if (driverEmail) {
          const { rows: du } = await pool.query<{ push_token: string | null }>(
            "SELECT push_token FROM auth_users WHERE email = $1 AND push_token IS NOT NULL", [driverEmail]
          ).catch(() => ({ rows: [] }));
          if (du[0]?.push_token) {
            sendPush([du[0].push_token], "Request Timed Out", "Your service request was cancelled after extended inactivity. Please submit a new request.", { screen: "DriverTabs" });
          }
        }
        // Notify provider
        const provObj = typeof job.provider === "string" ? JSON.parse(job.provider) : job.provider;
        const provId = provObj?.id as string | undefined;
        if (provId) {
          const { rows: pu } = await pool.query<{ push_token: string | null }>(
            "SELECT push_token FROM providers WHERE id = $1 AND push_token IS NOT NULL", [provId]
          ).catch(() => ({ rows: [] }));
          if (pu[0]?.push_token) {
            sendPush([pu[0].push_token], "Job Timed Out", "A job you accepted was auto-cancelled due to inactivity.", { screen: "ProviderTabs" });
          }
        }
      }
      if (stuckJobs.length > 0) {
        console.log(`[JOB TIMEOUT] cancelled ${stuckJobs.length} stuck job(s)`);
      }
    } catch (err) {
      console.error("[JOB TIMEOUT] error:", err);
    }
  }, 60_000);

  return httpServer;
}
