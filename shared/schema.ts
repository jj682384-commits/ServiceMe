import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  serial,
  boolean,
  numeric,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// ── auth_users ────────────────────────────────────────────────────────────────
// Main user accounts (drivers and providers).
export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  passwordHash: text("password_hash").notNull(),
  role: text("role"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  pushToken: text("push_token"),
  stripeCustomerId: text("stripe_customer_id"),
});

// ── sessions ──────────────────────────────────────────────────────────────────
// 30-day bearer tokens.
export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── providers ─────────────────────────────────────────────────────────────────
// Provider accounts with vehicle, verification, and earnings data.
export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  rating: numeric("rating"),
  reviewCount: integer("review_count"),
  vehicleType: text("vehicle_type"),
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  licensePlate: text("license_plate"),
  servicesOffered: jsonb("services_offered"),
  isAvailable: boolean("is_available"),
  providerType: text("provider_type"),
  verificationStatus: text("verification_status"),
  verificationDocuments: jsonb("verification_documents"),
  verificationSubmittedAt: timestamp("verification_submitted_at", { withTimezone: true }),
  verificationNotes: text("verification_notes"),
  badges: jsonb("badges"),
  location: jsonb("location"),
  lastLocationUpdate: timestamp("last_location_update", { withTimezone: true }),
  pushToken: text("push_token"),
  evCapable: boolean("ev_capable"),
  evServices: jsonb("ev_services"),
  acceptsPriorityJobs: boolean("accepts_priority_jobs"),
  payoutBankInfo: jsonb("payout_bank_info"),
  earningsBalance: numeric("earnings_balance"),
  stripeAccountId: text("stripe_account_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── jobs ──────────────────────────────────────────────────────────────────────
// Service requests (roadside jobs).
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  serviceType: text("service_type"),
  location: jsonb("location"),
  notes: text("notes"),
  status: text("status"),
  estimatedCost: numeric("estimated_cost"),
  driver: jsonb("driver"),
  provider: jsonb("provider"),
  providerLocation: jsonb("provider_location"),
  eta: integer("eta"),
  isExpress: boolean("is_express"),
  expressFee: numeric("express_fee"),
  serviceFee: numeric("service_fee"),
  totalCost: numeric("total_cost"),
  tip: numeric("tip"),
  driverRating: numeric("driver_rating"),
  receiptNumber: text("receipt_number"),
  timeSaved: integer("time_saved"),
  scheduledDate: text("scheduled_date"),
  isEmergency: boolean("is_emergency"),
  isEv: boolean("is_ev"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── reports ───────────────────────────────────────────────────────────────────
// User-submitted problem reports.
export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  category: text("category"),
  description: text("description"),
  userId: text("user_id"),
  userRole: text("user_role"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── waitlist ──────────────────────────────────────────────────────────────────
// Email signups from the landing page.
export const waitlist = pgTable("waitlist", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── provider_payouts ──────────────────────────────────────────────────────────
// Cash-out requests from providers.
export const providerPayouts = pgTable("provider_payouts", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  payoutType: text("payout_type").notNull().default("standard"),
  status: text("status").notNull().default("pending"),
  bankLast4: text("bank_last4"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ── legacy placeholder (kept to avoid accidental DROP in prod) ────────────────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});
