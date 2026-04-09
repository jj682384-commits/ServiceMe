import { pool } from "./db";
import * as crypto from "crypto";
import { promisify } from "util";

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return crypto.timingSafeEqual(Buffer.from(derived.toString("hex")), Buffer.from(hash));
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
