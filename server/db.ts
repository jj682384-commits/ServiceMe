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
  earnings_balance: number | null;
  stripe_account_id?: string | null;
  service_radius_miles: number | null;
  team_members: unknown[] | null;
  fleet_vehicles: unknown[] | null;
  business_hours: Record<string, unknown> | null;
}

export interface PayoutRow {
  id: string;
  provider_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  payout_type: string;
  status: string;
  bank_last4: string | null;
  created_at: string;
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
  provider_rating: number | null;
  receipt_number: string | null;
  time_saved: number | null;
  scheduled_date: string | null;
  is_emergency: boolean | null;
  is_ev: boolean;
  created_at: string;
  requested_provider_id: string | null;
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
    serviceRadiusMiles: r.service_radius_miles ?? 25,
    earningsBalance: Number(r.earnings_balance ?? 0),
    teamMembers: (r.team_members ?? []) as Array<{ id: string; name: string; role: string; phone: string }>,
    fleetVehicles: (r.fleet_vehicles ?? []) as Array<{ id: string; year: string; make: string; model: string; plate: string; type: string }>,
    businessHours: r.business_hours as Record<string, { open: boolean; from: string; to: string }> | undefined,
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
    providerRating: r.provider_rating ?? undefined,
    receiptNumber: r.receipt_number ?? undefined,
    timeSaved: r.time_saved ?? undefined,
    scheduledDate: r.scheduled_date ?? undefined,
    isEmergency: r.is_emergency ?? undefined,
    isEV: r.is_ev ?? false,
    createdAt: r.created_at,
    requestedProviderId: r.requested_provider_id ?? undefined,
  };
}
