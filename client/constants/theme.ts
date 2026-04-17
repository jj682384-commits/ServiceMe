import { Platform } from "react-native";

const electricBlue = "#0066FF";
const electricBlueDark = "#0050CC";
const electricRed = "#D92222";
const electricRedDark = "#B01A1A";
const electricCyan = "#00AAFF";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#475569",
    buttonText: "#FFFFFF",
    tabIconDefault: "#94A3B8",
    tabIconSelected: "#0055B3",
    link: "#0055B3",
    primary: "#C4341E",
    primaryDark: "#9E2A17",
    primaryLight: "#E55A3D",
    secondary: "#0055B3",
    secondaryDark: "#003D82",
    accent: "#047857",
    success: "#059669",
    warning: "#B45309",
    error: "#DC2626",
    backgroundRoot: "#F5F7FA",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#ECEEF2",
    backgroundTertiary: "#F0F2F5",
    border: "#D4D8E0",
    glassmorphic: "rgba(255, 255, 255, 0.85)",
    cardAnimatedBg: "rgba(255, 255, 255, 0.90)",
  },
  dark: {
    text: "#F0F2F5",
    textSecondary: "#B4BAC4",
    buttonText: "#FFFFFF",
    tabIconDefault: "#6B7280",
    tabIconSelected: electricCyan,
    link: electricCyan,
    primary: electricRed,
    primaryDark: electricRedDark,
    primaryLight: "#FF4444",
    secondary: electricBlue,
    secondaryDark: electricBlueDark,
    accent: electricCyan,
    success: "#00E676",
    warning: "#FFB300",
    error: "#FF5252",
    backgroundRoot: "#04060E",
    backgroundDefault: "#080C18",
    backgroundSecondary: "#0D1428",
    backgroundTertiary: "#121C38",
    border: "#1A2A48",
    glassmorphic: "rgba(8, 12, 24, 0.88)",
    cardAnimatedBg: "rgba(13, 20, 40, 0.80)",
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

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
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
    shadowColor: "#D92222",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: "#D92222",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const Gradients = {
  primary: {
    colors: ["#D92222", "#FF4444"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: ["#0066FF", "#00AAFF"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  dark: {
    colors: ["#D92222", "#0066FF"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};
