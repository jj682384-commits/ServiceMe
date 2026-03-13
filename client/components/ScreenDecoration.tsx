import React from "react";
import { StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

const { width: W, height: H } = Dimensions.get("window");

export function ScreenDecoration() {
  const { theme } = useTheme();
  const p = theme.primary;
  const s = theme.secondary ?? theme.primary;

  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      {/* Top-right quarter-circle rings */}
      <Circle cx={W + 2} cy={-2} r={90}  stroke={p} strokeWidth={1}   fill="none" strokeOpacity={0.07} />
      <Circle cx={W + 2} cy={-2} r={145} stroke={p} strokeWidth={0.9} fill="none" strokeOpacity={0.05} />
      <Circle cx={W + 2} cy={-2} r={205} stroke={p} strokeWidth={0.7} fill="none" strokeOpacity={0.035} />
      <Circle cx={W + 2} cy={-2} r={268} stroke={p} strokeWidth={0.5} fill="none" strokeOpacity={0.022} />

      {/* Bottom-left quarter-circle rings */}
      <Circle cx={-2} cy={H + 2} r={75}  stroke={s} strokeWidth={1}   fill="none" strokeOpacity={0.06} />
      <Circle cx={-2} cy={H + 2} r={125} stroke={s} strokeWidth={0.8} fill="none" strokeOpacity={0.04} />
      <Circle cx={-2} cy={H + 2} r={180} stroke={s} strokeWidth={0.6} fill="none" strokeOpacity={0.025} />

      {/* Subtle cross-hatch accent at center-right */}
      <Line x1={W - 28} y1={H * 0.44} x2={W - 28} y2={H * 0.56} stroke={p} strokeWidth={0.7} strokeOpacity={0.06} />
      <Line x1={W - 36} y1={H * 0.45} x2={W - 36} y2={H * 0.55} stroke={p} strokeWidth={0.6} strokeOpacity={0.045} />
      <Line x1={W - 44} y1={H * 0.46} x2={W - 44} y2={H * 0.54} stroke={p} strokeWidth={0.5} strokeOpacity={0.03} />

      {/* Small dot cluster top-left */}
      <Circle cx={22}  cy={H * 0.22} r={2}   fill={p} fillOpacity={0.07} />
      <Circle cx={34}  cy={H * 0.24} r={1.5} fill={p} fillOpacity={0.055} />
      <Circle cx={18}  cy={H * 0.27} r={1.5} fill={p} fillOpacity={0.045} />
      <Circle cx={40}  cy={H * 0.21} r={1}   fill={p} fillOpacity={0.04} />
      <Circle cx={28}  cy={H * 0.29} r={1}   fill={p} fillOpacity={0.035} />
    </Svg>
  );
}
