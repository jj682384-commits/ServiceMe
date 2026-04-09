import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAuthToken, saveAuthToken, deleteAuthToken } from "@/lib/secureStorage";
import { setAuthToken } from "@/lib/query-client";
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
  color?: string;
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
  driverRating?: number;
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
  verificationDocuments?: Record<string, boolean>;
  verificationSubmittedAt?: string;
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
    bgColorLight: "#F0F2F5",
    flashColor: "#00D9FF",
    flashColorLight: "#0055B3",
    colors: [
      ["#00D9FF", "#0099CC"], ["#FF6B35", "#FF3D00"], ["#7B2FFF", "#4800FF"],
      ["#FF006E", "#CC0055"], ["#FFE000", "#FFA500"], ["#00FFD4", "#00AAAA"],
    ],
    colorsLight: [
      ["#0055B3", "#003380"], ["#C4341E", "#9E2A17"], ["#5511AA", "#330088"],
      ["#AA1155", "#880033"], ["#887700", "#665500"], ["#006677", "#004455"],
    ],
    opacityBoost: 1.2,
    opacityBoostLight: 0.55,
  },
  ocean: {
    label: "Deep Sea",
    bgColor: "#000D18",
    bgColorLight: "#BEE8F4",
    flashColor: "#00E5FF",
    flashColorLight: "#0066AA",
    colors: [
      ["#00E5FF", "#0080CC"], ["#00FF88", "#00CC66"], ["#1DE9B6", "#00AA80"],
      ["#0066FF", "#0033CC"], ["#00FFCC", "#00AA99"], ["#40C4FF", "#007ACC"],
    ],
    colorsLight: [
      ["#006688", "#004466"], ["#007755", "#005533"], ["#0055BB", "#003399"],
      ["#008877", "#006655"], ["#0044AA", "#002288"], ["#006699", "#004477"],
    ],
    opacityBoost: 1.8,
    opacityBoostLight: 0.6,
  },
  sunset: {
    label: "Molten",
    bgColor: "#180400",
    bgColorLight: "#FFE4D0",
    flashColor: "#FF6A00",
    flashColorLight: "#C4341E",
    colors: [
      ["#FF6A00", "#CC3D00"], ["#FFD700", "#FFAA00"], ["#FF1744", "#CC0022"],
      ["#FF4500", "#CC2200"], ["#FF006E", "#CC0055"], ["#FFA000", "#CC6600"],
    ],
    colorsLight: [
      ["#CC4400", "#AA2200"], ["#AA7700", "#885500"], ["#CC1133", "#AA0011"],
      ["#BB3300", "#992200"], ["#997700", "#775500"], ["#AA4400", "#882200"],
    ],
    opacityBoost: 2.0,
    opacityBoostLight: 0.65,
  },
  aurora: {
    label: "Aurora",
    bgColor: "#010E08",
    bgColorLight: "#D0F0E0",
    flashColor: "#39FF14",
    flashColorLight: "#047857",
    colors: [
      ["#39FF14", "#22CC00"], ["#00FF5E", "#00CC44"], ["#00FFD4", "#00AA99"],
      ["#00DAFF", "#0099CC"], ["#8B00FF", "#5500CC"], ["#CCFF00", "#88BB00"],
    ],
    colorsLight: [
      ["#117700", "#005500"], ["#006633", "#004422"], ["#008877", "#006655"],
      ["#0077AA", "#005588"], ["#556600", "#334400"], ["#007744", "#005522"],
    ],
    opacityBoost: 1.8,
    opacityBoostLight: 0.6,
  },
  midnight: {
    label: "Galaxy",
    bgColor: "#0A0018",
    bgColorLight: "#E8D8F8",
    flashColor: "#B400FF",
    flashColorLight: "#7C3AED",
    colors: [
      ["#B400FF", "#7700CC"], ["#FF00C0", "#CC0088"], ["#4600FF", "#2200CC"],
      ["#DA00FF", "#AA00CC"], ["#FF006E", "#CC0044"], ["#6600FF", "#3300CC"],
    ],
    colorsLight: [
      ["#6600BB", "#440099"], ["#BB0077", "#880055"], ["#4400CC", "#2200AA"],
      ["#990088", "#660066"], ["#8800CC", "#6600AA"], ["#5500BB", "#330099"],
    ],
    opacityBoost: 2.2,
    opacityBoostLight: 0.6,
  },
  ember: {
    label: "Inferno",
    bgColor: "#1A0000",
    bgColorLight: "#FFE0E0",
    flashColor: "#FF2200",
    flashColorLight: "#C4341E",
    colors: [
      ["#FF2200", "#CC0000"], ["#FF6600", "#CC3300"], ["#FF0050", "#CC0033"],
      ["#FF9900", "#CC6600"], ["#CC0000", "#880000"], ["#FF4400", "#CC1100"],
    ],
    colorsLight: [
      ["#BB1100", "#880000"], ["#BB4400", "#882200"], ["#AA0033", "#880022"],
      ["#CC5500", "#AA3300"], ["#990000", "#660000"], ["#AA2200", "#881100"],
    ],
    opacityBoost: 2.0,
    opacityBoostLight: 0.65,
  },
  noir: {
    label: "Monochrome",
    bgColor: "#030303",
    bgColorLight: "#E8E8EC",
    flashColor: "#E0E0E0",
    flashColorLight: "#475569",
    colors: [
      ["#FFFFFF", "#CCCCCC"], ["#C0C0C0", "#888888"], ["#E8E8E8", "#BBBBBB"],
      ["#A8A8A8", "#666666"], ["#D0D0D0", "#999999"], ["#F0F0F0", "#CCCCCC"],
    ],
    colorsLight: [
      ["#333333", "#111111"], ["#555555", "#333333"], ["#444444", "#222222"],
      ["#2A2A2A", "#111111"], ["#484848", "#282828"], ["#3A3A3A", "#1A1A1A"],
    ],
    opacityBoost: 2.5,
    opacityBoostLight: 0.55,
  },
};

export const PREFERRED_THRESHOLD = 3;

export interface PreferredProvider {
  providerId: string;
  serviceCount: number;
  lastServiceDate: Date;
}

interface AppContextType {
  hydrated: boolean;
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
  updateVehicle: (id: string, updates: Partial<Omit<Vehicle, "id">>) => void;
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
  pendingJobs: ServiceRequest[];
  addPendingJob: (job: ServiceRequest) => void;
  removePendingJob: (id: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider | null>(null);
  const [_persisted, _setPersisted] = useState(false);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest | null>(null);
  const [requestHistory, setRequestHistory] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nearbyProviders, setNearbyProviders] = useState<Provider[]>([]);
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

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingJobs, setPendingJobs] = useState<ServiceRequest[]>([]);

  const addPendingJob = (job: ServiceRequest) => {
    setPendingJobs((prev) => [job, ...prev]);
  };

  const removePendingJob = (id: string) => {
    setPendingJobs((prev) => prev.filter((j) => j.id !== id));
  };

  useEffect(() => {
    (async () => {
      try {
        const [
          driverRaw,
          providerRaw,
          roleRaw,
          vehiclesRaw,
          paymentsRaw,
          historyRaw,
          contactsRaw,
          bgPrefRaw,
          savedToken,
        ] = await Promise.all([
          AsyncStorage.getItem("currentDriver"),
          AsyncStorage.getItem("currentProvider"),
          AsyncStorage.getItem("userRole"),
          AsyncStorage.getItem("vehicles"),
          AsyncStorage.getItem("paymentMethods"),
          AsyncStorage.getItem("requestHistory"),
          AsyncStorage.getItem("emergencyContacts"),
          AsyncStorage.getItem("backgroundPreferences"),
          loadAuthToken(),
        ]);
        if (savedToken) setAuthToken(savedToken);
        if (driverRaw) setCurrentDriver(JSON.parse(driverRaw));
        if (providerRaw) setCurrentProvider(JSON.parse(providerRaw));
        if (roleRaw) setUserRole(roleRaw as UserRole);
        if (driverRaw || providerRaw) setIsAuthenticated(true);
        if (vehiclesRaw) setVehicles(JSON.parse(vehiclesRaw));
        if (paymentsRaw) setPaymentMethods(JSON.parse(paymentsRaw));
        if (historyRaw) {
          const parsed = JSON.parse(historyRaw) as ServiceRequest[];
          setRequestHistory(
            parsed.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }))
          );
        }
        if (contactsRaw) setEmergencyContacts(JSON.parse(contactsRaw));
        if (bgPrefRaw) setBackgroundPreferences(JSON.parse(bgPrefRaw));
      } catch {}
      _setPersisted(true);
    })();
  }, []);

  useEffect(() => {
    if (!_persisted) return;
    if (currentDriver) AsyncStorage.setItem("currentDriver", JSON.stringify(currentDriver)).catch(() => {});
    else AsyncStorage.removeItem("currentDriver").catch(() => {});
  }, [currentDriver, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    if (currentProvider) AsyncStorage.setItem("currentProvider", JSON.stringify(currentProvider)).catch(() => {});
    else AsyncStorage.removeItem("currentProvider").catch(() => {});
  }, [currentProvider, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    if (userRole) AsyncStorage.setItem("userRole", userRole).catch(() => {});
    else AsyncStorage.removeItem("userRole").catch(() => {});
  }, [userRole, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("vehicles", JSON.stringify(vehicles)).catch(() => {});
  }, [vehicles, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("paymentMethods", JSON.stringify(paymentMethods)).catch(() => {});
  }, [paymentMethods, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("requestHistory", JSON.stringify(requestHistory)).catch(() => {});
  }, [requestHistory, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("emergencyContacts", JSON.stringify(emergencyContacts)).catch(() => {});
  }, [emergencyContacts, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("backgroundPreferences", JSON.stringify(backgroundPreferences)).catch(() => {});
  }, [backgroundPreferences, _persisted]);

  const setBackgroundMode = (mode: BackgroundMode) => {
    setBackgroundPreferences((prev) => ({ ...prev, mode }));
  };

  const setBackgroundColorScheme = (scheme: BackgroundColorScheme) => {
    setBackgroundPreferences((prev) => ({ ...prev, colorScheme: scheme }));
  };

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

  const updateVehicle = (id: string, updates: Partial<Omit<Vehicle, "id">>) => {
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...updates } : v))
    );
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
    setVehicles([]);
    setPaymentMethods([]);
    setRequestHistory([]);
    setEmergencyContacts([]);
    setAuthToken(null);
    deleteAuthToken().catch(() => {});
    AsyncStorage.multiRemove([
      "vehicles",
      "paymentMethods",
      "requestHistory",
      "emergencyContacts",
    ]).catch(() => {});
  };

  return (
    <AppContext.Provider
      value={{
        hydrated: _persisted,
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
        updateVehicle,
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
        pendingJobs,
        addPendingJob,
        removePendingJob,
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
