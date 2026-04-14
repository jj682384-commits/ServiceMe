import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export interface PayoutBankInfo {
  bankName: string;
  accountType: "checking" | "savings";
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
}

export interface ProviderRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  rating: number;
  review_count: number;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  license_plate: string;
  services_offered: string[];
  is_available: boolean;
  provider_type: string;
  verification_status: string;
  verification_documents: Record<string, boolean> | null;
  verification_submitted_at: string | null;
  verification_notes: string | null;
  badges: Array<{ type: string; label: string }> | null;
  location: { latitude: number; longitude: number };
  last_location_update: string | null;
  push_token: string | null;
  ev_capable: boolean;
  ev_services: string[];
  accepts_priority_jobs: boolean;
  payout_bank_info: PayoutBankInfo | null;
}

export interface JobRow {
  id: string;
  service_type: string;
  location: { address: string; latitude: number; longitude: number };
  notes: string;
  status: string;
  estimated_cost: number;
  driver: Record<string, unknown> | null;
  provider: Record<string, unknown> | null;
  provider_location: { latitude: number; longitude: number } | null;
  eta: number | null;
  is_express: boolean | null;
  express_fee: number | null;
  service_fee: number | null;
  total_cost: number | null;
  tip: number | null;
  driver_rating: number | null;
  receipt_number: string | null;
  time_saved: number | null;
  scheduled_date: string | null;
  is_emergency: boolean | null;
  is_ev: boolean;
  created_at: string;
}

export function rowToProvider(r: ProviderRow) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    rating: Number(r.rating),
    reviewCount: Number(r.review_count),
    vehicleType: r.vehicle_type as "tow_truck" | "service_van" | "pickup",
    vehicleMake: r.vehicle_make,
    vehicleModel: r.vehicle_model,
    licensePlate: r.license_plate,
    servicesOffered: r.services_offered,
    isAvailable: r.is_available,
    providerType: r.provider_type as "shop" | "independent",
    verificationStatus: r.verification_status,
    verificationDocuments: r.verification_documents ?? undefined,
    verificationSubmittedAt: r.verification_submitted_at ?? undefined,
    verificationNotes: r.verification_notes ?? undefined,
    badges: r.badges ?? undefined,
    location: r.location,
    lastLocationUpdate: r.last_location_update ?? undefined,
    pushToken: r.push_token ?? undefined,
    evCapable: r.ev_capable ?? false,
    evServices: r.ev_services ?? [],
    acceptsPriorityJobs: r.accepts_priority_jobs ?? false,
  };
}

export function rowToJob(r: JobRow) {
  return {
    id: r.id,
    serviceType: r.service_type,
    location: r.location,
    notes: r.notes,
    status: r.status as "pending" | "accepted" | "cancelled",
    estimatedCost: Number(r.estimated_cost),
    driver: r.driver ?? undefined,
    provider: r.provider ?? undefined,
    providerLocation: r.provider_location ?? undefined,
    eta: r.eta ?? undefined,
    isExpress: r.is_express ?? undefined,
    expressFee: r.express_fee != null ? Number(r.express_fee) : undefined,
    serviceFee: r.service_fee != null ? Number(r.service_fee) : undefined,
    totalCost: r.total_cost != null ? Number(r.total_cost) : undefined,
    tip: r.tip != null ? Number(r.tip) : undefined,
    driverRating: r.driver_rating ?? undefined,
    receiptNumber: r.receipt_number ?? undefined,
    timeSaved: r.time_saved ?? undefined,
    scheduledDate: r.scheduled_date ?? undefined,
    isEmergency: r.is_emergency ?? undefined,
    isEV: r.is_ev ?? false,
    createdAt: r.created_at,
  };
}
