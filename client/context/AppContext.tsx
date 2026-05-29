import React, { createContext, useContext, useState, useMemo, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadAuthToken, saveAuthToken, deleteAuthToken } from "@/lib/secureStorage";
import { setAuthToken, apiRequest } from "@/lib/query-client";
export type UserRole = "driver" | "provider" | null;

export type MembershipTier = "free" | "premium";

export type ServiceType = "flat_tire" | "jump_start" | "tow" | "fuel" | "lockout" | "obd_diagnostic" | "mobile_inflation" | "tire_check" | "tire_replacement" | "battery_check";

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
  isEV?: boolean;
  requestedProviderId?: string;  // set when driver picks a specific provider from the map
  lastChatMessage?: string;      // set when the first real message is sent
  lastChatMessageAt?: Date;      // timestamp for sorting
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
  freeServicesUsed?: number;
  freeServicesReset?: string;
}

export type EVService = "ev_charging" | "ev_towing" | "hv_certified";

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
  evCapable?: boolean;
  evServices?: EVService[];
  acceptsPriorityJobs?: boolean;
  location?: {
    latitude: number;
    longitude: number;
  };
  distance?: number;
  isBusy?: boolean;
  serviceRadiusMiles?: number;
  pushToken?: string;
  verificationNotes?: string;
  earningsBalance?: number;
  teamMembers?: Array<{ id: string; name: string; role: string; phone: string }>;
  fleetVehicles?: Array<{ id: string; year: string; make: string; model: string; plate: string; type: string }>;
  businessHours?: Record<string, { open: boolean; from: string; to: string }>;
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
  switchUserRole: (role: "driver" | "provider") => Promise<void>;
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
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
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
  pendingJobs: ServiceRequest[];
  addPendingJob: (job: ServiceRequest) => void;
  useFreeService: () => void;
  removePendingJob: (id: string) => void;
  logout: () => void;
  themeOverride: "dark" | "light" | null;
  toggleTheme: () => void;
  setThemePreference: (pref: "dark" | "light" | null) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

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
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pendingJobs, setPendingJobs] = useState<ServiceRequest[]>([]);
  const [themeOverride, setThemeOverride] = useState<"dark" | "light" | null>(null);

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
          activeRequestRaw,
          savedToken,
          themeRaw,
          authUserRaw,
          notifRaw,
          radiusRaw,
        ] = await Promise.all([
          AsyncStorage.getItem("currentDriver"),
          AsyncStorage.getItem("currentProvider"),
          AsyncStorage.getItem("userRole"),
          AsyncStorage.getItem("vehicles"),
          AsyncStorage.getItem("paymentMethods"),
          AsyncStorage.getItem("requestHistory"),
          AsyncStorage.getItem("emergencyContacts"),
          AsyncStorage.getItem("activeRequest"),
          loadAuthToken(),
          AsyncStorage.getItem("themeOverride"),
          AsyncStorage.getItem("authUser"),
          AsyncStorage.getItem("notificationsEnabled"),
          AsyncStorage.getItem("searchRadius"),
        ]);
        if (savedToken) setAuthToken(savedToken);
        if (themeRaw === "dark" || themeRaw === "light") setThemeOverride(themeRaw);
        if (authUserRaw) setAuthUser(JSON.parse(authUserRaw));
        if (driverRaw) setCurrentDriver(JSON.parse(driverRaw));
        if (providerRaw) setCurrentProvider(JSON.parse(providerRaw));
        if (roleRaw) setUserRole(roleRaw as UserRole);
        if (driverRaw || providerRaw || authUserRaw) setIsAuthenticated(true);
        if (vehiclesRaw) setVehicles(JSON.parse(vehiclesRaw));
        if (paymentsRaw) setPaymentMethods(JSON.parse(paymentsRaw));
        if (historyRaw) {
          const parsed = JSON.parse(historyRaw) as ServiceRequest[];
          setRequestHistory(
            parsed.map((r) => ({ ...r, createdAt: new Date(r.createdAt) }))
          );
        }
        if (contactsRaw) setEmergencyContacts(JSON.parse(contactsRaw));
        if (notifRaw !== null) setNotificationsEnabled(notifRaw === "true");
        if (radiusRaw !== null) { const r = parseInt(radiusRaw, 10); if (!isNaN(r)) setSearchRadius(r); }
        if (activeRequestRaw) {
          const ar = JSON.parse(activeRequestRaw) as ServiceRequest;
          // Only restore if not in a terminal state
          if (ar.status !== "completed" && ar.status !== "cancelled") {
            setActiveRequest({ ...ar, createdAt: new Date(ar.createdAt) });
          }
        }
      } catch {}
      _setPersisted(true);
    })();
  }, []);

  useEffect(() => {
    if (!_persisted) return;
    if (authUser) AsyncStorage.setItem("authUser", JSON.stringify(authUser)).catch(() => {});
    else AsyncStorage.removeItem("authUser").catch(() => {});
  }, [authUser, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    if (currentDriver) AsyncStorage.setItem("currentDriver", JSON.stringify(currentDriver)).catch(() => {});
    else AsyncStorage.removeItem("currentDriver").catch(() => {});
  }, [currentDriver, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    if (currentProvider) {
      AsyncStorage.setItem("currentProvider", JSON.stringify(currentProvider)).catch(() => {});
      // Keep the background alert task aware of this provider's ID so it can
      // filter direct-request jobs and fire the correct notification title.
      import("@/lib/providerJobAlerts").then(({ setProviderIdForAlerts }) => {
        setProviderIdForAlerts(currentProvider.id);
      }).catch(() => {});
    } else {
      AsyncStorage.removeItem("currentProvider").catch(() => {});
    }
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
    AsyncStorage.setItem("notificationsEnabled", String(notificationsEnabled)).catch(() => {});
  }, [notificationsEnabled, _persisted]);

  useEffect(() => {
    if (!_persisted) return;
    AsyncStorage.setItem("searchRadius", String(searchRadius)).catch(() => {});
  }, [searchRadius, _persisted]);

  // On first hydration, pull preferences from server to stay in sync across devices.
  useEffect(() => {
    if (!_persisted) return;
    (async () => {
      try {
        const token = await loadAuthToken();
        if (!token) return;
        const res = await apiRequest("GET", "/api/auth/me");
        const me = await res.json() as {
          searchRadius?: number;
          notificationsEnabled?: boolean;
          emergencyContacts?: EmergencyContact[];
        };
        if (me.searchRadius !== undefined) setSearchRadius(me.searchRadius);
        if (me.notificationsEnabled !== undefined) setNotificationsEnabled(me.notificationsEnabled);
        if (Array.isArray(me.emergencyContacts) && me.emergencyContacts.length > 0) {
          setEmergencyContacts(me.emergencyContacts);
        }
      } catch {}
    })();
  }, [_persisted]);

  useEffect(() => {
    if (!_persisted) return;
    if (activeRequest && activeRequest.status !== "completed" && activeRequest.status !== "cancelled") {
      AsyncStorage.setItem("activeRequest", JSON.stringify(activeRequest)).catch(() => {});
    } else {
      AsyncStorage.removeItem("activeRequest").catch(() => {});
    }
  }, [activeRequest, _persisted]);

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
      const now = new Date();
      const resetDate = new Date(now);
      if (selectedCycle === "yearly") {
        resetDate.setFullYear(resetDate.getFullYear() + 1);
      } else {
        resetDate.setMonth(resetDate.getMonth() + 1);
      }
      setCurrentDriver({
        ...currentDriver,
        membership: tier,
        isOnTrial: false,
        billingCycle: selectedCycle,
        freeServicesUsed: 0,
        freeServicesReset: tier === "premium" ? resetDate.toISOString() : undefined,
      });
      if (cycle) setBillingCycle(cycle);
    }
  };

  const useFreeService = () => {
    if (!currentDriver || currentDriver.membership !== "premium") return;
    const now = new Date();
    const cycle = currentDriver.billingCycle ?? "monthly";
    const existingReset = currentDriver.freeServicesReset ? new Date(currentDriver.freeServicesReset) : null;
    const isPastReset = !existingReset || now > existingReset;
    const newUsed = isPastReset ? 1 : (currentDriver.freeServicesUsed ?? 0) + 1;
    const newReset = isPastReset ? (() => {
      const d = new Date(now);
      if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
      else d.setMonth(d.getMonth() + 1);
      return d.toISOString();
    })() : currentDriver.freeServicesReset;
    setCurrentDriver({ ...currentDriver, freeServicesUsed: newUsed, freeServicesReset: newReset });
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
    setEmergencyContacts((prev) => {
      const updated = [...prev, contact];
      apiRequest("PATCH", "/api/auth/preferences", { emergencyContacts: updated }).catch(() => {});
      return updated;
    });
  };

  const removeEmergencyContact = (index: number) => {
    setEmergencyContacts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      apiRequest("PATCH", "/api/auth/preferences", { emergencyContacts: updated }).catch(() => {});
      return updated;
    });
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
      "authUser",
      "vehicles",
      "paymentMethods",
      "requestHistory",
      "emergencyContacts",
      "activeRequest",
    ]).catch(() => {});
  };

  const toggleTheme = () => {
    setThemeOverride((prev) => {
      const next = prev === "light" ? "dark" : "light";
      AsyncStorage.setItem("themeOverride", next).catch(() => {});
      return next;
    });
  };

  const setThemePreference = (pref: "dark" | "light" | null) => {
    setThemeOverride(pref);
    if (pref === null) {
      AsyncStorage.removeItem("themeOverride").catch(() => {});
    } else {
      AsyncStorage.setItem("themeOverride", pref).catch(() => {});
    }
  };

  const switchUserRole = async (role: "driver" | "provider"): Promise<void> => {
    setUserRole(role);
    try {
      await apiRequest("PATCH", "/api/auth/role", { role });
    } catch (err) {
      console.warn("[switchUserRole] Failed to sync role to server:", err);
    }
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
        switchUserRole,
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
        notificationsEnabled,
        setNotificationsEnabled,
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
        pendingJobs,
        addPendingJob,
        useFreeService,
        removePendingJob,
        logout,
        themeOverride,
        toggleTheme,
        setThemePreference,
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
