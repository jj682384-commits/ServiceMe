import { Platform } from "react-native";

// Chrome / metallic palette — pulled from the new +R mark logo
const chromeWhite   = "#FFFFFF";
const chromeSilver  = "#C0C0C0";
const chromeGray    = "#888888";
const chromeDark    = "#2A2A2A";
const emergencyRed  = "#CC1B1B";
const emergencyRedDk = "#A01515";
const emergencyRedLt = "#E83030";

// Dark-mode accent — chrome / metallic steel blue (dark enough for white text)
const chromeBabyBlue   = "#4A9CC6";
const chromeBabyBlueDk = "#2C7BAF";
const chromeBabyBlueLt = "#6BBDE0";

export const Colors = {
  light: {
    text:                "#0D0D0D",
    textSecondary:       "#4A4A4A",
    buttonText:          "#FFFFFF",
    tabIconDefault:      "#94A3B8",
    tabIconSelected:     "#0D0D0D",
    link:                "#0055B3",
    primary:             "#0D0D0D",
    primaryDark:         "#000000",
    primaryLight:        "#2A2A2A",
    secondary:           "#0055B3",
    secondaryDark:       "#003D82",
    accent:              "#1A7CC7",
    success:             "#059669",
    warning:             "#0D0D0D",
    error:               "#DC2626",
    backgroundRoot:      "#F0F4F8",
    backgroundDefault:   "#FFFFFF",
    backgroundSecondary: "#EBF0F6",
    backgroundTertiary:  "#E2EAF2",
    border:              "#CDD5E0",
    glassmorphic:        "rgba(255, 255, 255, 0.88)",
    cardAnimatedBg:      "rgba(255, 255, 255, 0.92)",
  },
  dark: {
    // Chrome / pitch-black aesthetic
    text:                "#F0F0F0",
    textSecondary:       "#A0A0A0",
    buttonText:          "#FFFFFF",
    tabIconDefault:      "#555555",
    tabIconSelected:     chromeSilver,
    link:                chromeSilver,
    primary:             chromeBabyBlue,
    primaryDark:         chromeBabyBlueDk,
    primaryLight:        chromeBabyBlueLt,
    secondary:           chromeSilver,
    secondaryDark:       chromeGray,
    accent:              chromeWhite,
    success:             "#00E676",
    warning:             "#FFB300",
    error:               "#FF5252",
    backgroundRoot:      "#000000",
    backgroundDefault:   "#080808",
    backgroundSecondary: "#111111",
    backgroundTertiary:  "#1A1A1A",
    border:              "rgba(255,255,255,0.09)",
    glassmorphic:        "rgba(10, 10, 10, 0.92)",
    cardAnimatedBg:      "rgba(20, 20, 20, 0.90)",
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

const _fontRegular   = Platform.select({ web: "'Exo 2', sans-serif", default: "Exo2_400Regular" })!;
const _fontMedium    = Platform.select({ web: "'Exo 2', sans-serif", default: "Exo2_500Medium" })!;
const _fontSemiBold  = Platform.select({ web: "'Exo 2', sans-serif", default: "Exo2_600SemiBold" })!;
const _fontBold      = Platform.select({ web: "'Exo 2', sans-serif", default: "Exo2_700Bold" })!;

export const Typography = {
  display: {
    fontSize: 36,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    fontFamily: _fontBold,
  },
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    fontFamily: _fontBold,
  },
  h2: {
    fontSize: 28,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    fontFamily: _fontBold,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
    fontFamily: _fontSemiBold,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    letterSpacing: 0.2,
    fontFamily: _fontSemiBold,
  },
  body: {
    fontSize: 16,
    fontWeight: "400" as const,
    fontFamily: _fontRegular,
  },
  small: {
    fontSize: 14,
    fontWeight: "400" as const,
    fontFamily: _fontRegular,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    fontFamily: _fontSemiBold,
  },
  link: {
    fontSize: 16,
    fontWeight: "400" as const,
    fontFamily: _fontRegular,
  },
};

export const Fonts = Platform.select({
  web: {
    sans: "'Exo 2', sans-serif",
    serif: "'Exo 2', sans-serif",
    rounded: "'Exo 2', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
  default: {
    sans: "Exo2_400Regular",
    serif: "Exo2_400Regular",
    rounded: "Exo2_400Regular",
    mono: "monospace",
  },
});

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.40,
    shadowRadius: 12,
    elevation: 6,
  },
  fab: {
    shadowColor: chromeBabyBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.40,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const Gradients = {
  primary: {
    colors: [chromeBabyBlue, chromeBabyBlueDk] as [string, string],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondary: {
    colors: [chromeDark, "#111111"] as [string, string],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  dark: {
    colors: ["#1A1A1A", "#000000"] as [string, string],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
};
