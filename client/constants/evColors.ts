export const EV_DARK = {
  bg: "#050510",
  bgCard: "#0C0C1E",
  bgCardLight: "#12122A",
  bgGlow: "#0A0A20",
  neonGreen: "#00FF88",
  neonGreenDim: "#00CC6A",
  neonCyan: "#00E5FF",
  neonBlue: "#4D7CFF",
  neonPurple: "#B44DFF",
  neonPink: "#FF4DA6",
  neonYellow: "#FFD600",
  white: "#F0F4FF",
  whiteDim: "#8892A8",
  whiteGhost: "#4A5068",
  border: "#1A1A3A",
  borderGlow: "#00FF8820",
  gradientGreen: ["#00FF88", "#00CC6A", "#00E5FF"] as const,
  gradientPurple: ["#B44DFF", "#7C3AED", "#4D7CFF"] as const,
  gradientDark: ["#050510", "#0A0A20", "#0C0C1E"] as const,
  topGradient: ["#00FF8808", "#00E5FF05", "transparent"] as const,
};

export const EV_LIGHT = {
  bg: "#F0F9F4",
  bgCard: "#FFFFFF",
  bgCardLight: "#F7FBF9",
  bgGlow: "#E8F5EE",
  neonGreen: "#059669",
  neonGreenDim: "#047857",
  neonCyan: "#0891B2",
  neonBlue: "#3B82F6",
  neonPurple: "#8B5CF6",
  neonPink: "#EC4899",
  neonYellow: "#D97706",
  white: "#1A1D21",
  whiteDim: "#6B7280",
  whiteGhost: "#9CA3AF",
  border: "#D1D5DB",
  borderGlow: "#05966920",
  gradientGreen: ["#059669", "#047857", "#0891B2"] as const,
  gradientPurple: ["#8B5CF6", "#7C3AED", "#3B82F6"] as const,
  gradientDark: ["#F0F9F4", "#E8F5EE", "#F7FBF9"] as const,
  topGradient: ["#05966908", "#0891B205", "transparent"] as const,
};

export type EVColors = typeof EV_DARK & typeof EV_LIGHT;

export function getEVColors(isDark: boolean): EVColors {
  return isDark ? EV_DARK : EV_LIGHT;
}
