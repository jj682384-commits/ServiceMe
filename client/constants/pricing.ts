import type { ServiceType } from "@/context/AppContext";

export const SERVICE_FEE = 3.99;
export const EXPRESS_FEE = 9.99;

export const COMPETITOR_PRICES: Partial<Record<ServiceType, { low: number; high: number }>> = {
  flat_tire:        { low: 120, high: 180 },
  jump_start:       { low: 80,  high: 150 },
  fuel:             { low: 75,  high: 120 },
  lockout:          { low: 100, high: 175 },
  tow:              { low: 200, high: 400 },
  obd_diagnostic:   { low: 75,  high: 150 },
  tire_replacement: { low: 80,  high: 160 },
  mobile_inflation: { low: 40,  high: 80  },
  tire_check:       { low: 30,  high: 60  },
  battery_check:    { low: 50,  high: 90  },
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  flat_tire:        "Flat Tire Repair",
  jump_start:       "Jump Start",
  fuel:             "Fuel Delivery",
  lockout:          "Lockout Service",
  tow:              "Tow Service",
  obd_diagnostic:   "OBD Diagnostic",
  tire_replacement: "Tire Replacement",
  mobile_inflation: "Mobile Tire Inflation",
  tire_check:       "Tire Inspection",
  battery_check:    "Battery Check",
};
