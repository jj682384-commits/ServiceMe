import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import OpenAI from "openai";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

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
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const providerStore: ProviderRecord[] = [];

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

const messageHistory = new Map<string, ChatMessage[]>();
const clients = new Set<WsClient>();

interface JobRecord {
  id: string;
  serviceType: string;
  location: { address: string; latitude: number; longitude: number };
  notes: string;
  status: "pending" | "accepted" | "cancelled";
  estimatedCost: number;
  driver?: Record<string, unknown>;
  provider?: Record<string, unknown>;
  eta?: number;
  isExpress?: boolean;
  expressFee?: number;
  serviceFee?: number;
  totalCost?: number;
  receiptNumber?: string;
  timeSaved?: number;
  createdAt: string;
  scheduledDate?: string;
}

const jobStore = new Map<string, JobRecord>();
let broadcastJobUpdate: (job: JobRecord) => void = () => {};

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

const adminTokens = new Set<string>();

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers["authorization"] || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {

  app.get("/admin", (_req: Request, res: Response) => {
    const adminPage = path.resolve(process.cwd(), "server", "templates", "admin.html");
    if (fs.existsSync(adminPage)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(fs.readFileSync(adminPage, "utf-8"));
    } else {
      res.status(404).send("Admin page not found");
    }
  });

  app.post("/api/admin/login", (req: Request, res: Response) => {
    const { password } = req.body as { password: string };
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();
    const submitted = (password || "").trim();
    console.log(`[ADMIN] env pw len=${adminPassword.length} submitted len=${submitted.length} match=${submitted === adminPassword}`);
    if (!adminPassword) {
      return res.status(503).json({ error: "ADMIN_PASSWORD not configured" });
    }
    if (!submitted || submitted !== adminPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    adminTokens.add(token);
    res.json({ token });
  });

  app.get("/api/admin/providers", adminAuth, (_req: Request, res: Response) => {
    const providers = providerStore.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      providerType: p.providerType,
      verificationStatus: p.verificationStatus,
      verificationDocuments: p.verificationDocuments || {},
      verificationSubmittedAt: p.verificationSubmittedAt || null,
      verificationNotes: p.verificationNotes || null,
      servicesOffered: p.servicesOffered,
      vehicleMake: p.vehicleMake,
      vehicleModel: p.vehicleModel,
      licensePlate: p.licensePlate,
      rating: p.rating,
      reviewCount: p.reviewCount,
      isAvailable: p.isAvailable,
    }));
    res.json(providers);
  });

  app.post("/api/admin/providers/:id/approve", adminAuth, (req: Request, res: Response) => {
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    provider.verificationStatus = "verified";
    provider.verificationNotes = undefined;
    res.json({ success: true, verificationStatus: "verified" });
  });

  app.post("/api/admin/providers/:id/reject", adminAuth, (req: Request, res: Response) => {
    const { notes } = req.body as { notes?: string };
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    provider.verificationStatus = "not_started";
    provider.verificationNotes = notes || "Your documents were not accepted. Please re-upload and resubmit.";
    provider.verificationDocuments = {};
    provider.verificationSubmittedAt = undefined;
    res.json({ success: true, verificationStatus: "not_started", notes: provider.verificationNotes });
  });

  app.post("/api/providers/:id/verification", (req: Request, res: Response) => {
    const { verificationDocuments, verificationSubmittedAt } = req.body as {
      verificationDocuments: Record<string, boolean>;
      verificationSubmittedAt: string;
    };
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    provider.verificationDocuments = verificationDocuments;
    provider.verificationSubmittedAt = verificationSubmittedAt;
    provider.verificationStatus = "pending";
    res.json({ success: true });
  });

  app.get("/api/providers/:id/verification", (req: Request, res: Response) => {
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    res.json({
      verificationStatus: provider.verificationStatus,
      verificationNotes: provider.verificationNotes || null,
      verificationSubmittedAt: provider.verificationSubmittedAt || null,
    });
  });

  app.post("/api/diagnose", async (req: Request, res: Response) => {
    try {
      const { symptom, symptomLabel, followUpQuestions, followUpAnswers } = req.body;

      if (!symptom) {
        return res.status(400).json({ error: "symptom is required" });
      }

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
      const result = JSON.parse(content);

      res.json(result);
    } catch (error) {
      console.error("Diagnosis error:", error);
      res.status(500).json({ error: "Failed to generate diagnosis" });
    }
  });

  app.get("/api/chat/:conversationId/messages", (req: Request, res: Response) => {
    const { conversationId } = req.params;
    const history = messageHistory.get(conversationId) || [];
    res.json({ messages: history });
  });

  app.get("/api/providers/nearby", (req: Request, res: Response) => {
    const { lat, lng, radius } = req.query as Record<string, string>;
    const maxRadius = parseFloat(radius || "25");
    let result = providerStore.filter((p) => p.isAvailable);
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      result = result
        .map((p) => ({ ...p, distance: calcDistance(userLat, userLng, p.location.latitude, p.location.longitude) }))
        .filter((p) => p.distance <= maxRadius)
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
    }
    res.json(result);
  });

  app.post("/api/providers/register", (req: Request, res: Response) => {
    const data = req.body as ProviderRecord;
    if (!data.id || !data.name) return res.status(400).json({ error: "id and name required" });
    const existing = providerStore.find((p) => p.id === data.id);
    if (existing) {
      Object.assign(existing, data, { lastLocationUpdate: new Date().toISOString() });
      return res.json(existing);
    }
    const provider: ProviderRecord = { ...data, lastLocationUpdate: new Date().toISOString() };
    providerStore.push(provider);
    res.json(provider);
  });

  app.patch("/api/providers/:id/location", (req: Request, res: Response) => {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    provider.location = { latitude, longitude };
    provider.lastLocationUpdate = new Date().toISOString();
    res.json({ success: true });
  });

  app.patch("/api/providers/:id/availability", (req: Request, res: Response) => {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ error: "isAvailable (boolean) required" });
    }
    const provider = providerStore.find((p) => p.id === req.params.id);
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    provider.isAvailable = isAvailable;
    res.json({ success: true });
  });

  app.post("/api/jobs", (req: Request, res: Response) => {
    const data = req.body as Partial<JobRecord>;
    if (!data.id || !data.serviceType) return res.status(400).json({ error: "id and serviceType required" });
    const job: JobRecord = {
      id: data.id,
      serviceType: data.serviceType,
      location: data.location ?? { address: "Unknown", latitude: 0, longitude: 0 },
      notes: data.notes ?? "",
      status: "pending",
      estimatedCost: data.estimatedCost ?? 0,
      driver: data.driver,
      eta: data.eta,
      isExpress: data.isExpress,
      expressFee: data.expressFee,
      serviceFee: data.serviceFee,
      totalCost: data.totalCost,
      receiptNumber: data.receiptNumber,
      timeSaved: data.timeSaved,
      createdAt: data.createdAt ?? new Date().toISOString(),
    };
    jobStore.set(job.id, job);
    res.json(job);
  });

  app.get("/api/jobs/pending", (_req: Request, res: Response) => {
    const pending = Array.from(jobStore.values()).filter((j) => j.status === "pending");
    res.set("Cache-Control", "no-store");
    res.json(pending);
  });

  app.get("/api/jobs/:id", (req: Request, res: Response) => {
    const job = jobStore.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.set("Cache-Control", "no-store");
    res.json(job);
  });

  app.patch("/api/jobs/:id/accept", (req: Request, res: Response) => {
    const job = jobStore.get(req.params.id);
    console.log(`[ACCEPT] job=${req.params.id} found=${!!job} status=${job?.status}`);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (job.status !== "pending") return res.status(409).json({ error: "Job already taken" });
    job.status = "accepted";
    job.provider = req.body.provider ?? null;
    job.eta = req.body.eta ?? 8;
    console.log(`[ACCEPT] updated to accepted, provider=${JSON.stringify(job.provider)}`);
    broadcastJobUpdate(job);
    res.json(job);
  });

  app.patch("/api/jobs/:id/cancel", (req: Request, res: Response) => {
    const job = jobStore.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    job.status = "cancelled";
    res.json(job);
  });

  app.patch("/api/jobs/:id/status", (req: Request, res: Response) => {
    const job = jobStore.get(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    const { status } = req.body as { status: string };
    if (!status) return res.status(400).json({ error: "status required" });
    job.status = status as JobRecord["status"];
    broadcastJobUpdate(job);
    res.json(job);
  });

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
            conversationId,
            senderId,
            senderRole,
            content,
            timestamp: new Date().toISOString(),
          };

          const history = messageHistory.get(conversationId) || [];
          history.push(message);
          if (history.length > 200) history.splice(0, history.length - 200);
          messageHistory.set(conversationId, history);

          const payload = JSON.stringify({ type: "message", message });
          ws.send(payload);
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

              const autoPayload = JSON.stringify({ type: "message", message: autoReply });
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(autoPayload);
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
