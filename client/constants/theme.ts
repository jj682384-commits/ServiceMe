import { Platform } from "react-native";

const electricCyan = "#00D9FF";
const electricCyanDark = "#00A8CC";
const vibrantCoral = "#FF6B35";
const coralDark = "#E54B1B";
const brightLime = "#39FF14";

export const Colors = {
  light: {
    text: "#0F172A",
    textSecondary: "#475569",
    buttonText: "#FFFFFF",
    tabIconDefault: "#8FA8C8",
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
    backgroundRoot: "#C8DCFF",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#E0ECFF",
    backgroundTertiary: "#EEF5FF",
    border: "#82AEDD",
    glassmorphic: "rgba(255, 255, 255, 0.82)",
    cardAnimatedBg: "rgba(255, 255, 255, 0.88)",
  },
  dark: {
    text: "#F0F2F5",
    textSecondary: "#B4BAC4",
    buttonText: "#0F1419",
    tabIconDefault: "#6B7280",
    tabIconSelected: electricCyan,
    link: electricCyan,
    primary: vibrantCoral,
    primaryDark: coralDark,
    primaryLight: "#FF8C5A",
    secondary: electricCyan,
    secondaryDark: electricCyanDark,
    accent: brightLime,
    success: "#00E676",
    warning: "#FFB300",
    error: "#FF5252",
    backgroundRoot: "#0A0E27",
    backgroundDefault: "#0F1419",
    backgroundSecondary: "#151D35",
    backgroundTertiary: "#1A2442",
    border: "#242E52",
    glassmorphic: "rgba(15, 20, 41, 0.85)",
    cardAnimatedBg: "rgba(20, 25, 45, 0.75)",
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
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#00D9FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const Gradients = {
  primary: {
    colors: ["#FF6B35", "#FF8C5A"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: ["#00D9FF", "#00FFFF"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  dark: {
    colors: ["#FF6B35", "#00D9FF"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};
