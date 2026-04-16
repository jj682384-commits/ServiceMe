import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

export function ScreenDecoration() {
  const { theme, isDark } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const p = theme.primary;
  const s = theme.secondary ?? theme.primary;
  const base = isDark ? 1 : 2.2;

  return (
    <Svg
      width={W}
      height={H}
      style={StyleSheet.absoluteFillObject}
      pointerEvents="none"
    >
      <Circle cx={W + 2} cy={-2} r={90}  stroke={p} strokeWidth={1.2} fill="none" strokeOpacity={0.08 * base} />
      <Circle cx={W + 2} cy={-2} r={148} stroke={p} strokeWidth={1.0} fill="none" strokeOpacity={0.06 * base} />
      <Circle cx={W + 2} cy={-2} r={210} stroke={p} strokeWidth={0.8} fill="none" strokeOpacity={0.04 * base} />
      <Circle cx={W + 2} cy={-2} r={276} stroke={p} strokeWidth={0.6} fill="none" strokeOpacity={0.025 * base} />

      <Circle cx={-2} cy={H + 2} r={78}  stroke={s} strokeWidth={1.2} fill="none" strokeOpacity={0.07 * base} />
      <Circle cx={-2} cy={H + 2} r={130} stroke={s} strokeWidth={0.9} fill="none" strokeOpacity={0.05 * base} />
      <Circle cx={-2} cy={H + 2} r={188} stroke={s} strokeWidth={0.7} fill="none" strokeOpacity={0.03 * base} />

      <Line x1={W - 28} y1={H * 0.44} x2={W - 28} y2={H * 0.56} stroke={p} strokeWidth={0.8} strokeOpacity={0.07 * base} />
      <Line x1={W - 38} y1={H * 0.45} x2={W - 38} y2={H * 0.55} stroke={p} strokeWidth={0.7} strokeOpacity={0.055 * base} />
      <Line x1={W - 48} y1={H * 0.46} x2={W - 48} y2={H * 0.54} stroke={p} strokeWidth={0.5} strokeOpacity={0.04 * base} />

      <Circle cx={22} cy={H * 0.22} r={2.5} fill={p} fillOpacity={0.09 * base} />
      <Circle cx={36} cy={H * 0.24} r={2.0} fill={p} fillOpacity={0.07 * base} />
      <Circle cx={16} cy={H * 0.27} r={1.8} fill={p} fillOpacity={0.055 * base} />
      <Circle cx={44} cy={H * 0.21} r={1.4} fill={p} fillOpacity={0.045 * base} />
      <Circle cx={28} cy={H * 0.30} r={1.2} fill={p} fillOpacity={0.04 * base} />
    </Svg>
  );
}
