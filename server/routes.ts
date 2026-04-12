import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { pool, rowToProvider, rowToJob, type ProviderRow, type JobRow } from "./db";
import { hashPassword, verifyPassword, createSession, getUserByToken, deleteSession, extractToken } from "./auth";

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

const adminTokens = new Set<string>();

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token || !adminTokens.has(token)) {
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

// ── DB broadcast helper ───────────────────────────────────────────────────────

let broadcastJobUpdate: (job: JobRecord) => void = () => {};

// ── Routes ────────────────────────────────────────────────────────────────────

export async function registerRoutes(app: Express): Promise<Server> {

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
      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: "Email or password is incorrect" });
      }
      const token = await createSession(user.id);
      console.log(`[AUTH] signin userId=${user.id} email=${email}`);
      res.json({ userId: user.id, token, role: user.role, name: user.name, email: user.email, phone: user.phone });
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

  app.get("/admin", (_req: Request, res: Response) => {
    const adminPage = path.resolve(process.cwd(), "server", "templates", "admin.html");
    if (fs.existsSync(adminPage)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(fs.readFileSync(adminPage, "utf-8"));
    } else {
      res.status(404).send("Admin page not found");
    }
  });

  // ── Admin auth ────────────────────────────────────────────────────────────────

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
    const submitted = (password || "").trim();
    if (!adminPassword) return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
    if (!submitted || submitted !== adminPassword) return res.status(401).json({ error: "Invalid password" });
    const token = crypto.randomBytes(32).toString("hex");
    adminTokens.add(token);
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
      const prompt = `You are an expert automotive roadside assistance diagnostic AI for the ServiceMe app. A driver is stranded and needs help.

Primary symptom reported: "${symptomLabel || symptom}"

Follow-up answers from the driver:
${qaLines || "None provided"}

Based on these symptoms, provide a diagnosis and service recommendation. You MUST respond with ONLY valid JSON in this exact shape:

{
  "likelyIssue": "short issue name (e.g. Dead Battery)",
  "description": "2-3 sentence explanation of the issue and what to expect",
  "costRange": "price range as string (e.g. $35 - $55)",
  "serviceType": one of: "jump_start" | "flat_tire" | "fuel" | "lockout" | "towing" | "obd_diagnostic" | "other",
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
      let result = rows.map(rowToProvider);
      if (lat && lng) {
        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        result = result
          .map((p) => ({ ...p, distance: calcDistance(userLat, userLng, p.location.latitude, p.location.longitude) }))
          .filter((p) => (p as ProviderRecord & { distance: number }).distance <= maxRadius)
          .sort((a, b) => ((a as ProviderRecord & { distance: number }).distance ?? 0) - ((b as ProviderRecord & { distance: number }).distance ?? 0));
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
           verification_notes, badges, location, last_location_update, push_token
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
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

  // ── Jobs ──────────────────────────────────────────────────────────────────────

  app.post("/api/jobs", async (req: Request, res: Response) => {
    const data = req.body as Partial<JobRecord>;
    if (!data.id || !data.serviceType) return res.status(400).json({ error: "id and serviceType required" });
    try {
      const { rows } = await pool.query<JobRow>(
        `INSERT INTO jobs (
           id, service_type, location, notes, status, estimated_cost,
           driver, eta, is_express, express_fee, service_fee, total_cost,
           receipt_number, time_saved, created_at, is_emergency
         ) VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
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
        ]
      );
      const job = rows.length ? rowToJob(rows[0]) : { ...data, status: "pending", createdAt: new Date().toISOString() } as JobRecord;

      // Instantly notify all connected provider WebSocket clients about the new job
      broadcastJobUpdate(job as JobRecord);

      // Push notifications to available providers
      const { rows: providers } = await pool.query<ProviderRow>(
        "SELECT push_token FROM providers WHERE is_available = true AND push_token IS NOT NULL"
      );
      const tokens = providers.map((p) => p.push_token as string).filter(Boolean);
      if (tokens.length > 0) {
        const serviceLabels: Record<string, string> = {
          flat_tire: "Flat Tire", jump_start: "Jump Start", tow: "Tow Service",
          fuel: "Fuel Delivery", lockout: "Lockout", obd_diagnostic: "OBD Diagnostic", other: "Roadside Assistance",
        };
        const serviceLabel = serviceLabels[job.serviceType] || "Roadside Assistance";
        const urgency = job.isEmergency ? "EMERGENCY: " : "";
        const messages = tokens.map((to) => ({
          to, title: `${urgency}New Job Request`,
          body: `${serviceLabel} needed nearby — $${job.estimatedCost} estimated. Tap to accept.`,
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
      res.json({ success: true });
    } catch (err) {
      console.error("[jobs/tip]", err);
      res.status(500).json({ error: "Database error" });
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
            "You are a helpful customer support agent for ServiceMe, a roadside assistance app. " +
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
          const { conversationId, senderId, senderRole } = data;
          clientRecord = { ws, conversationId, senderId, senderRole };
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

          const peersInRoom = [...clients].filter(
            (c) => c.conversationId === conversationId && c !== clientRecord
          );
          if (peersInRoom.length === 0) {
            const replyDelay = 2000 + Math.random() * 2000;
            setTimeout(() => {
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
