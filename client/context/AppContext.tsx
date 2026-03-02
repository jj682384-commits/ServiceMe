import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "driver" | "provider" | null;

export type MembershipTier = "free" | "premium";

export type ServiceType = "flat_tire" | "jump_start" | "tow" | "fuel" | "lockout" | "obd_diagnostic" | "other";

export type ServiceStatus = "pending" | "accepted" | "en_route" | "arrived" | "in_progress" | "completed" | "cancelled";

export type VerificationStatus = "verified" | "pending" | "not_started";

export type ProviderType = "shop" | "independent";

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
  const [requestHistory, setRequestHistory] = useState<ServiceRequest[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nearbyProviders, setNearbyProviders] = useState<Provider[]>(mockProviders);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [searchRadius, setSearchRadius] = useState(10);
  const [serviceRadius, setServiceRadius] = useState(15);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");

  const addToHistory = (request: ServiceRequest) => {
    setRequestHistory((prev) => [request, ...prev]);
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
