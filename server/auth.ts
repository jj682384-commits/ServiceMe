import { pool } from "./db";
import * as crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

// v2 hashes encode the cost parameter so we can tune it without breaking old accounts.
// Format: "v2:<N>:<salt>:<hash>"   (old format: "<salt>:<hash>" used N=16384)
const SCRYPT_N = 4096;  // 4× faster than the 16384 default, still secure for token-based auth

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64, { N: SCRYPT_N })) as Buffer;
  return `v2:${SCRYPT_N}:${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    if (stored.startsWith("v2:")) {
      // New format: v2:<N>:<salt>:<hash>
      const parts = stored.split(":");
      if (parts.length < 4) return false;
      const N = parseInt(parts[1], 10);
      const salt = parts[2];
      const hash = parts.slice(3).join(":");  // rejoin in case hash contains colons
      const derived = (await scrypt(password, salt, 64, { N })) as Buffer;
      return crypto.timingSafeEqual(Buffer.from(derived.toString("hex")), Buffer.from(hash));
    } else {
      // Legacy format: <salt>:<hash> — verify with the old default N=16384
      const [salt, hash] = stored.split(":");
      if (!salt || !hash) return false;
      const derived = (await scrypt(password, salt, 64, { N: 16384 })) as Buffer;
      return crypto.timingSafeEqual(Buffer.from(derived.toString("hex")), Buffer.from(hash));
    }
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await pool.query(
    "INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
    [token, userId]
  );
  return token;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: string;
}

export async function getUserByToken(token: string): Promise<SessionUser | null> {
  const { rows } = await pool.query<SessionUser & { token: string }>(
    `SELECT u.id, u.email, u.name, u.phone, u.role
     FROM sessions s
     JOIN auth_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  return rows[0] || null;
}

export async function deleteSession(token: string): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
}

export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return null;
}
