import React, { createContext, useContext, useState, useMemo, ReactNode } from "react";
import { mockHistory as initialHistory } from "@/constants/mockHistory";

export type UserRole = "driver" | "provider" | null;

export type MembershipTier = "free" | "premium";

export type ServiceType = "flat_tire" | "jump_start" | "tow" | "fuel" | "lockout" | "obd_diagnostic" | "other";

export type ServiceStatus = "pending" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";

export type VerificationStatus = "verified" | "pending" | "not_started";

export type ProviderType = "shop" | "independent";

export type TireType = "run_flat" | "spare" | "none";
export type FuelType = "regular" | "premium" | "diesel" | "electric";
export type DrivetrainType = "fwd" | "rwd" | "awd" | "4wd";

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  tireType: TireType;
  fuelType: FuelType;
  drivetrain: DrivetrainType;
  isDefault: boolean;
}

export type BadgeType = "five_star" | "centurion" | "night_owl" | "speed_demon" | "veteran";

export interface ProviderBadge {
  type: BadgeType;
  label: string;
}

export const BADGE_CONFIG: Record<BadgeType, { label: string; icon: string; color: string }> = {
  five_star: { label: "5-Star for 6 Months", icon: "award", color: "#F59E0B" },
  centurion: { label: "100+ Successful Calls", icon: "check-circle", color: "#10B981" },
  night_owl: { label: "Night Shift Specialist", icon: "moon", color: "#8B5CF6" },
  speed_demon: { label: "Fast Response", icon: "zap", color: "#EF4444" },
  veteran: { label: "3+ Years Experience", icon: "shield", color: "#3B82F6" },
};

export interface ServiceRequest {
  id: string;
  serviceType: ServiceType;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  notes: string;
  status: ServiceStatus;
  estimatedCost: number;
  createdAt: Date;
  provider?: Provider;
  driver?: Driver;
  eta?: number;
  isExpress?: boolean;
  expressFee?: number;
  serviceFee?: number;
  totalCost?: number;
  tip?: number;
  receiptNumber?: string;
  timeSaved?: number;
  scheduledDate?: Date;
}

export type BillingCycle = "monthly" | "yearly";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatarPreset: number;
  membership?: MembershipTier;
  trialStartDate?: Date;
  trialEndDate?: Date;
  isOnTrial?: boolean;
  billingCycle?: BillingCycle;
}

export interface Provider {
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
  servicesOffered: ServiceType[];
  isAvailable: boolean;
  providerType: ProviderType;
  verificationStatus: VerificationStatus;
  badges?: ProviderBadge[];
  location?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
}

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export interface Message {
  id: string;
  senderId: string;
  senderRole: UserRole;
  content: string;
  timestamp: Date;
  requestId: string;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface PaymentMethod {
  id: string;
  type: "visa" | "mastercard" | "amex" | "discover";
  last4: string;
  isDefault: boolean;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
}

export type BackgroundMode = "animated" | "solid";
export type BackgroundColorScheme = "default" | "ocean" | "sunset" | "aurora" | "midnight" | "ember" | "noir";

export interface BackgroundPreferences {
  mode: BackgroundMode;
  colorScheme: BackgroundColorScheme;
}

export interface SchemeConfig {
  label: string;
  bgColor: string;
  bgColorLight: string;
  flashColor: string;
  flashColorLight: string;
  colors: string[][];
  colorsLight: string[][];
  opacityBoost: number;
  opacityBoostLight: number;
}

export const BACKGROUND_SCHEMES: Record<BackgroundColorScheme, SchemeConfig> = {
  default: {
    label: "Cyber",
    bgColor: "#04081C",
    bgColorLight: "#0A1540",
    flashColor: "#00D9FF",
    flashColorLight: "#00E5FF",
    colors: [
      ["#00D9FF", "#0099CC"], ["#FF6B35", "#FF3D00"], ["#7B2FFF", "#4800FF"],
      ["#FF006E", "#CC0055"], ["#FFE000", "#FFA500"], ["#00FFD4", "#00AAAA"],
    ],
    colorsLight: [
      ["#00E5FF", "#00AACC"], ["#FF4D00", "#CC2200"], ["#8B00FF", "#5500CC"],
      ["#FF2D78", "#CC0055"], ["#C4FF00", "#88CC00"], ["#00FFD0", "#00AAAA"],
    ],
    opacityBoost: 1.2,
    opacityBoostLight: 1.0,
  },
  ocean: {
    label: "Deep Sea",
    bgColor: "#000D18",
    bgColorLight: "#003040",
    flashColor: "#00E5FF",
    flashColorLight: "#00FFD4",
    colors: [
      ["#00E5FF", "#0080CC"], ["#00FF88", "#00CC66"], ["#1DE9B6", "#00AA80"],
      ["#0066FF", "#0033CC"], ["#00FFCC", "#00AA99"], ["#40C4FF", "#007ACC"],
    ],
    colorsLight: [
      ["#00FFD4", "#00CCAA"], ["#00C8FF", "#0099CC"], ["#00FFB0", "#00CC88"],
      ["#0088FF", "#0055CC"], ["#00FFAA", "#00CC88"], ["#20D8FF", "#0099BB"],
    ],
    opacityBoost: 1.8,
    opacityBoostLight: 1.1,
  },
  sunset: {
    label: "Molten",
    bgColor: "#180400",
    bgColorLight: "#2A0800",
    flashColor: "#FF6A00",
    flashColorLight: "#FF8C00",
    colors: [
      ["#FF6A00", "#CC3D00"], ["#FFD700", "#FFAA00"], ["#FF1744", "#CC0022"],
      ["#FF4500", "#CC2200"], ["#FF006E", "#CC0055"], ["#FFA000", "#CC6600"],
    ],
    colorsLight: [
      ["#FF8C00", "#FF5500"], ["#FFD400", "#FFAA00"], ["#FF2D78", "#CC0044"],
      ["#FF3300", "#CC1100"], ["#FFE000", "#FFC000"], ["#FF6600", "#CC3300"],
    ],
    opacityBoost: 2.0,
    opacityBoostLight: 1.2,
  },
  aurora: {
    label: "Aurora",
    bgColor: "#010E08",
    bgColorLight: "#001808",
    flashColor: "#39FF14",
    flashColorLight: "#5AFF00",
    colors: [
      ["#39FF14", "#22CC00"], ["#00FF5E", "#00CC44"], ["#00FFD4", "#00AA99"],
      ["#00DAFF", "#0099CC"], ["#8B00FF", "#5500CC"], ["#CCFF00", "#88BB00"],
    ],
    colorsLight: [
      ["#5AFF00", "#33CC00"], ["#00FF66", "#00CC44"], ["#00FFE0", "#00CCAA"],
      ["#00E5A0", "#00CC88"], ["#FFD700", "#FFAA00"], ["#00FF44", "#00BB22"],
    ],
    opacityBoost: 1.8,
    opacityBoostLight: 1.1,
  },
  midnight: {
    label: "Galaxy",
    bgColor: "#0A0018",
    bgColorLight: "#150030",
    flashColor: "#B400FF",
    flashColorLight: "#CC00FF",
    colors: [
      ["#B400FF", "#7700CC"], ["#FF00C0", "#CC0088"], ["#4600FF", "#2200CC"],
      ["#DA00FF", "#AA00CC"], ["#FF006E", "#CC0044"], ["#6600FF", "#3300CC"],
    ],
    colorsLight: [
      ["#CC00FF", "#9900CC"], ["#FF00A0", "#CC0077"], ["#7700FF", "#4400CC"],
      ["#FF006E", "#CC0055"], ["#E040FB", "#BB22CC"], ["#9B00FF", "#6600CC"],
    ],
    opacityBoost: 2.2,
    opacityBoostLight: 1.2,
  },
  ember: {
    label: "Inferno",
    bgColor: "#1A0000",
    bgColorLight: "#2A0200",
    flashColor: "#FF2200",
    flashColorLight: "#FF3300",
    colors: [
      ["#FF2200", "#CC0000"], ["#FF6600", "#CC3300"], ["#FF0050", "#CC0033"],
      ["#FF9900", "#CC6600"], ["#CC0000", "#880000"], ["#FF4400", "#CC1100"],
    ],
    colorsLight: [
      ["#FF3300", "#CC1100"], ["#FF7700", "#CC4400"], ["#FF1100", "#CC0000"],
      ["#FFAA00", "#CC7700"], ["#FFD700", "#CC9900"], ["#FF5500", "#CC2200"],
    ],
    opacityBoost: 2.0,
    opacityBoostLight: 1.2,
  },
  noir: {
    label: "Monochrome",
    bgColor: "#030303",
    bgColorLight: "#0A0A0A",
    flashColor: "#E0E0E0",
    flashColorLight: "#FFFFFF",
    colors: [
      ["#FFFFFF", "#CCCCCC"], ["#C0C0C0", "#888888"], ["#E8E8E8", "#BBBBBB"],
      ["#A8A8A8", "#666666"], ["#D0D0D0", "#999999"], ["#F0F0F0", "#CCCCCC"],
    ],
    colorsLight: [
      ["#FFFFFF", "#E8E8E8"], ["#E0E0E0", "#C0C0C0"], ["#F8F8F8", "#DDDDDD"],
      ["#D8D8D8", "#BBBBBB"], ["#FFFFFF", "#D0D0D0"], ["#EEEEEE", "#CCCCCC"],
    ],
    opacityBoost: 2.5,
    opacityBoostLight: 1.5,
  },
};

export const PREFERRED_THRESHOLD = 3;

export interface PreferredProvider {
  providerId: string;
  serviceCount: number;
  lastServiceDate: Date;
}

interface AppContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
  authUser: AuthUser | null;
  setAuthUser: (user: AuthUser | null) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentDriver: Driver | null;
  setCurrentDriver: (driver: Driver | null) => void;
  currentProvider: Provider | null;
  setCurrentProvider: (provider: Provider | null) => void;
  activeRequest: ServiceRequest | null;
  setActiveRequest: (request: ServiceRequest | null) => void;
  requestHistory: ServiceRequest[];
  addToHistory: (request: ServiceRequest) => void;
  updateHistoryEntry: (id: string, updates: Partial<ServiceRequest>) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  nearbyProviders: Provider[];
  setNearbyProviders: (providers: Provider[]) => void;
  upgradeMembership: (tier: MembershipTier, cycle?: BillingCycle) => void;
  startFreeTrial: () => void;
  cancelTrial: () => void;
  getTrialDaysRemaining: () => number;
  billingCycle: BillingCycle;
  setBillingCycle: (cycle: BillingCycle) => void;
  userLocation: UserLocation | null;
  setUserLocation: (location: UserLocation | null) => void;
  getProvidersWithDistance: () => Provider[];
  getTowProviders: () => Provider[];
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
  serviceRadius: number;
  setServiceRadius: (radius: number) => void;
  emergencyContacts: EmergencyContact[];
  setEmergencyContacts: (contacts: EmergencyContact[]) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  removeEmergencyContact: (index: number) => void;
  vehicles: Vehicle[];
  addVehicle: (vehicle: Omit<Vehicle, "id">) => void;
  removeVehicle: (id: string) => void;
  setDefaultVehicle: (id: string) => void;
  getDefaultVehicle: () => Vehicle | undefined;
  preferredProviders: PreferredProvider[];
  isPreferredProvider: (providerId: string) => boolean;
  getPreferredProviderInfo: (providerId: string) => PreferredProvider | undefined;
  getProviderServiceCount: (providerId: string) => number;
  paymentMethods: PaymentMethod[];
  addPaymentMethod: (method: Omit<PaymentMethod, "id">) => void;
  removePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;
  backgroundPreferences: BackgroundPreferences;
  setBackgroundMode: (mode: BackgroundMode) => void;
  setBackgroundColorScheme: (scheme: BackgroundColorScheme) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const mockProviders: Provider[] = [
  {
    id: "p1",
    name: "Mike's Towing",
    phone: "+1 555-0101",
    email: "mike@towing.com",
    rating: 4.8,
    reviewCount: 156,
    vehicleType: "tow_truck",
    vehicleMake: "Ford",
    vehicleModel: "F-550",
    licensePlate: "TOW-123",
    servicesOffered: ["tow", "flat_tire", "jump_start", "lockout"],
    isAvailable: true,
    providerType: "shop",
    verificationStatus: "verified",
    badges: [
      { type: "centurion", label: "100+ Successful Calls" },
      { type: "veteran", label: "3+ Years Experience" },
    ],
    location: { latitude: 37.7849, longitude: -122.4094 },
  },
  {
    id: "p2",
    name: "Quick Fix Auto",
    phone: "+1 555-0102",
    email: "quick@fixauto.com",
    rating: 4.6,
    reviewCount: 89,
    vehicleType: "service_van",
    vehicleMake: "Mercedes",
    vehicleModel: "Sprinter",
    licensePlate: "FIX-456",
    servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout"],
    isAvailable: true,
    providerType: "shop",
    verificationStatus: "verified",
    badges: [
      { type: "speed_demon", label: "Fast Response" },
    ],
    location: { latitude: 37.7899, longitude: -122.4034 },
  },
  {
    id: "p3",
    name: "Road Rescue",
    phone: "+1 555-0103",
    email: "help@roadrescue.com",
    rating: 4.9,
    reviewCount: 234,
    vehicleType: "pickup",
    vehicleMake: "Chevrolet",
    vehicleModel: "Silverado",
    licensePlate: "RES-789",
    servicesOffered: ["flat_tire", "jump_start", "fuel", "other"],
    isAvailable: true,
    providerType: "independent",
    verificationStatus: "verified",
    badges: [
      { type: "five_star", label: "5-Star for 6 Months" },
      { type: "centurion", label: "100+ Successful Calls" },
      { type: "night_owl", label: "Night Shift Specialist" },
    ],
    location: { latitude: 37.7799, longitude: -122.4194 },
  },
  {
    id: "p4",
    name: "Bay Area Roadside",
    phone: "+1 555-0104",
    email: "bay@roadside.com",
    rating: 4.5,
    reviewCount: 67,
    vehicleType: "service_van",
    vehicleMake: "Ford",
    vehicleModel: "Transit",
    licensePlate: "BAY-321",
    servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout", "obd_diagnostic"],
    isAvailable: true,
    providerType: "shop",
    verificationStatus: "verified",
    badges: [
      { type: "veteran", label: "3+ Years Experience" },
    ],
    location: { latitude: 37.7920, longitude: -122.4150 },
  },
  {
    id: "p5",
    name: "Carlos H.",
    phone: "+1 555-0105",
    email: "carlos@helpers.com",
    rating: 4.7,
    reviewCount: 42,
    vehicleType: "pickup",
    vehicleMake: "Toyota",
    vehicleModel: "Tacoma",
    licensePlate: "HLP-555",
    servicesOffered: ["flat_tire", "jump_start", "fuel"],
    isAvailable: true,
    providerType: "independent",
    verificationStatus: "verified",
    badges: [
      { type: "speed_demon", label: "Fast Response" },
      { type: "night_owl", label: "Night Shift Specialist" },
    ],
    location: { latitude: 37.7780, longitude: -122.4050 },
  },
  {
    id: "p6",
    name: "Golden Gate Towing",
    phone: "+1 555-0106",
    email: "info@ggtowing.com",
    rating: 4.4,
    reviewCount: 198,
    vehicleType: "tow_truck",
    vehicleMake: "International",
    vehicleModel: "4300",
    licensePlate: "GGT-888",
    servicesOffered: ["tow", "flat_tire", "lockout"],
    isAvailable: true,
    providerType: "shop",
    verificationStatus: "verified",
    badges: [
      { type: "centurion", label: "100+ Successful Calls" },
    ],
    location: { latitude: 37.7950, longitude: -122.4200 },
  },
  {
    id: "p7",
    name: "Sarah M.",
    phone: "+1 555-0107",
    email: "sarah@quickhelp.com",
    rating: 5.0,
    reviewCount: 28,
    vehicleType: "pickup",
    vehicleMake: "Honda",
    vehicleModel: "Ridgeline",
    licensePlate: "SRH-777",
    servicesOffered: ["flat_tire", "jump_start", "lockout", "other"],
    isAvailable: true,
    providerType: "independent",
    verificationStatus: "verified",
    badges: [
      { type: "five_star", label: "5-Star for 6 Months" },
    ],
    location: { latitude: 37.7830, longitude: -122.3990 },
  },
  {
    id: "p8",
    name: "AutoCare Express",
    phone: "+1 555-0108",
    email: "service@autocare.com",
    rating: 4.3,
    reviewCount: 312,
    vehicleType: "service_van",
    vehicleMake: "Ram",
    vehicleModel: "ProMaster",
    licensePlate: "ACE-999",
    servicesOffered: ["flat_tire", "jump_start", "fuel", "lockout", "obd_diagnostic", "other"],
    isAvailable: true,
    providerType: "shop",
    verificationStatus: "verified",
    badges: [
      { type: "centurion", label: "100+ Successful Calls" },
      { type: "veteran", label: "3+ Years Experience" },
      { type: "speed_demon", label: "Fast Response" },
    ],
    location: { latitude: 37.7870, longitude: -122.4250 },
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<ServiceRequest[]>(initialHistory);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nearbyProviders, setNearbyProviders] = useState<Provider[]>(mockProviders);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [serviceRadius, setServiceRadius] = useState(15);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [backgroundPreferences, setBackgroundPreferences] = useState<BackgroundPreferences>({
    mode: "animated",
    colorScheme: "default",
  });

  const setBackgroundMode = (mode: BackgroundMode) => {
    setBackgroundPreferences((prev) => ({ ...prev, mode }));
  };

  const setBackgroundColorScheme = (scheme: BackgroundColorScheme) => {
    setBackgroundPreferences((prev) => ({ ...prev, colorScheme: scheme }));
  };

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    {
      id: "pm-1",
      type: "visa",
      last4: "4242",
      isDefault: true,
      expiryMonth: 12,
      expiryYear: 2027,
      cardholderName: "Alex Johnson",
    },
    {
      id: "pm-2",
      type: "mastercard",
      last4: "8888",
      isDefault: false,
      expiryMonth: 6,
      expiryYear: 2026,
      cardholderName: "Alex Johnson",
    },
  ]);

  const getProviderServiceCount = (providerId: string): number => {
    return requestHistory.filter(
      (r) => r.provider?.id === providerId && r.status === "completed"
    ).length;
  };

  const preferredProviders: PreferredProvider[] = React.useMemo(() => {
    const counts: Record<string, { count: number; lastDate: Date }> = {};
    requestHistory.forEach((r) => {
      if (r.provider && r.status === "completed") {
        const pid = r.provider.id;
        if (!counts[pid]) {
          counts[pid] = { count: 0, lastDate: r.createdAt };
        }
        counts[pid].count++;
        if (r.createdAt > counts[pid].lastDate) {
          counts[pid].lastDate = r.createdAt;
        }
      }
    });
    return Object.entries(counts)
      .filter(([, data]) => data.count >= PREFERRED_THRESHOLD)
      .map(([providerId, data]) => ({
        providerId,
        serviceCount: data.count,
        lastServiceDate: data.lastDate,
      }))
      .sort((a, b) => b.serviceCount - a.serviceCount);
  }, [requestHistory]);

  const isPreferredProvider = (providerId: string): boolean => {
    return preferredProviders.some((p) => p.providerId === providerId);
  };

  const getPreferredProviderInfo = (providerId: string): PreferredProvider | undefined => {
    return preferredProviders.find((p) => p.providerId === providerId);
  };

  const addToHistory = (request: ServiceRequest) => {
    setRequestHistory((prev) => [request, ...prev]);
  };

  const updateHistoryEntry = (id: string, updates: Partial<ServiceRequest>) => {
    setRequestHistory((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const upgradeMembership = (tier: MembershipTier, cycle?: BillingCycle) => {
    if (currentDriver) {
      const selectedCycle = cycle || billingCycle;
      setCurrentDriver({ ...currentDriver, membership: tier, isOnTrial: false, billingCycle: selectedCycle });
      if (cycle) setBillingCycle(cycle);
    }
  };

  const startFreeTrial = () => {
    if (currentDriver) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
      setCurrentDriver({
        ...currentDriver,
        membership: "premium",
        isOnTrial: true,
        trialStartDate: now,
        trialEndDate: trialEnd,
      });
    }
  };

  const cancelTrial = () => {
    if (currentDriver) {
      setCurrentDriver({
        ...currentDriver,
        membership: "free",
        isOnTrial: false,
        trialStartDate: undefined,
        trialEndDate: undefined,
      });
    }
  };

  const getTrialDaysRemaining = (): number => {
    if (!currentDriver?.isOnTrial || !currentDriver.trialEndDate) return 0;
    const now = new Date();
    const end = new Date(currentDriver.trialEndDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
  };

  const getProvidersWithDistance = (): Provider[] => {
    if (!userLocation) return nearbyProviders;
    return nearbyProviders
      .map((provider) => ({
        ...provider,
        distance: provider.location
          ? calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              provider.location.latitude,
              provider.location.longitude
            )
          : undefined,
      }))
      .filter((provider) => provider.distance === undefined || provider.distance <= searchRadius)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  };

  const getTowProviders = (): Provider[] => {
    const allProviders = getProvidersWithDistance();
    return allProviders.filter(
      (provider) =>
        provider.servicesOffered.includes("tow") && provider.vehicleType === "tow_truck"
    );
  };

  const addEmergencyContact = (contact: EmergencyContact) => {
    setEmergencyContacts((prev) => [...prev, contact]);
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const addVehicle = (vehicle: Omit<Vehicle, "id">) => {
    const newVehicle: Vehicle = { ...vehicle, id: `v-${Date.now()}` };
    setVehicles((prev) => {
      if (newVehicle.isDefault) {
        return [...prev.map((v) => ({ ...v, isDefault: false })), newVehicle];
      }
      if (prev.length === 0) {
        return [{ ...newVehicle, isDefault: true }];
      }
      return [...prev, newVehicle];
    });
  };

  const removeVehicle = (id: string) => {
    setVehicles((prev) => {
      const filtered = prev.filter((v) => v.id !== id);
      if (filtered.length > 0 && !filtered.some((v) => v.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const setDefaultVehicle = (id: string) => {
    setVehicles((prev) =>
      prev.map((v) => ({ ...v, isDefault: v.id === id }))
    );
  };

  const getDefaultVehicle = (): Vehicle | undefined => {
    return vehicles.find((v) => v.isDefault) || vehicles[0];
  };

  const addPaymentMethod = (method: Omit<PaymentMethod, "id">) => {
    const newMethod: PaymentMethod = { ...method, id: `pm-${Date.now()}` };
    setPaymentMethods((prev) => {
      if (newMethod.isDefault) {
        return [...prev.map((m) => ({ ...m, isDefault: false })), newMethod];
      }
      if (prev.length === 0) {
        return [{ ...newMethod, isDefault: true }];
      }
      return [...prev, newMethod];
    });
  };

  const removePaymentMethod = (id: string) => {
    setPaymentMethods((prev) => {
      const filtered = prev.filter((m) => m.id !== id);
      if (filtered.length > 0 && !filtered.some((m) => m.isDefault)) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
  };

  const setDefaultPaymentMethod = (id: string) => {
    setPaymentMethods((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
  };

  const logout = () => {
    setIsAuthenticated(false);
    setAuthUser(null);
    setUserRole(null);
    setCurrentDriver(null);
    setCurrentProvider(null);
    setActiveRequest(null);
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        authUser,
        setAuthUser,
        userRole,
        setUserRole,
        currentDriver,
        setCurrentDriver,
        currentProvider,
        setCurrentProvider,
        activeRequest,
        setActiveRequest,
        requestHistory,
        addToHistory,
        updateHistoryEntry,
        messages,
        addMessage,
        nearbyProviders,
        setNearbyProviders,
        upgradeMembership,
        startFreeTrial,
        cancelTrial,
        getTrialDaysRemaining,
        billingCycle,
        setBillingCycle,
        userLocation,
        setUserLocation,
        getProvidersWithDistance,
        getTowProviders,
        searchRadius,
        setSearchRadius,
        serviceRadius,
        setServiceRadius,
        emergencyContacts,
        setEmergencyContacts,
        addEmergencyContact,
        removeEmergencyContact,
        vehicles,
        addVehicle,
        removeVehicle,
        setDefaultVehicle,
        getDefaultVehicle,
        preferredProviders,
        isPreferredProvider,
        getPreferredProviderInfo,
        getProviderServiceCount,
        paymentMethods,
        addPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        backgroundPreferences,
        setBackgroundMode,
        setBackgroundColorScheme,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
