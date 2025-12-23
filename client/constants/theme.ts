import { Platform } from "react-native";

// Modern 2025 Color Palette
const vibrantPurple = "#7C3AED";
const vibrantPurpleDark = "#6D28D9";
const vibrantPurpleLight = "#A78BFA";
const cyan = "#06B6D4";
const cyanDark = "#0891B2";
const magenta = "#EC4899";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#64748B",
    buttonText: "#FFFFFF",
    tabIconDefault: "#94A3B8",
    tabIconSelected: vibrantPurple,
    link: vibrantPurple,
    primary: vibrantPurple,
    primaryDark: vibrantPurpleDark,
    primaryLight: vibrantPurpleLight,
    secondary: cyan,
    secondaryDark: cyanDark,
    accent: magenta,
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    backgroundRoot: "#F9FAFB",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E2E8F0",
    border: "#E2E8F0",
    glassmorphic: "rgba(255, 255, 255, 0.8)",
  },
  dark: {
    text: "#F8FAFC",
    textSecondary: "#CBD5E1",
    buttonText: "#FFFFFF",
    tabIconDefault: "#64748B",
    tabIconSelected: "#22D3EE",
    link: "#22D3EE",
    primary: vibrantPurple,
    primaryDark: vibrantPurpleDark,
    primaryLight: vibrantPurpleLight,
    secondary: cyan,
    secondaryDark: cyanDark,
    accent: magenta,
    success: "#10B981",
    warning: "#FBBF24",
    error: "#EF4444",
    backgroundRoot: "#0F172A",
    backgroundDefault: "#1E293B",
    backgroundSecondary: "#334155",
    backgroundTertiary: "#475569",
    border: "#334155",
    glassmorphic: "rgba(30, 41, 59, 0.8)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
  fabSize: 64,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 36,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Modern Glassmorphic Shadows & Effects
export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
};

// Gradient Definitions (for reference in components)
export const Gradients = {
  primary: {
    colors: ["#7C3AED", "#06B6D4"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: ["#06B6D4", "#EC4899"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  dark: {
    colors: ["#A78BFA", "#22D3EE"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};
