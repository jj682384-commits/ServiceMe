import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

export const DARK_BG  = "#04060E";
export const LIGHT_BG = "#F0F4F8";

const AnimatedBackground = React.memo(function AnimatedBackground({
  showEkg: _showEkg,
  customColors: _c,
  opacityBoost: _o,
  flashColor: _f,
  isDark: _id,
}: {
  showEkg?: boolean;
  customColors?: any;
  opacityBoost?: number;
  flashColor?: string;
  isDark?: boolean;
}) {
  const scheme = useColorScheme();
  const dark = scheme !== "light";
  const bg = dark ? DARK_BG : LIGHT_BG;

  return (
    <View style={[styles.root, { backgroundColor: bg }]} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFillObject}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient id="rg_fire" cx="12%" cy="22%" r="58%">
            <Stop
              offset="0%"
              stopColor="#CC1B1B"
              stopOpacity={dark ? "0.22" : "0.12"}
            />
            <Stop offset="100%" stopColor="#CC1B1B" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="rg_ice" cx="88%" cy="18%" r="58%">
            <Stop
              offset="0%"
              stopColor="#1A7CC7"
              stopOpacity={dark ? "0.22" : "0.12"}
            />
            <Stop offset="100%" stopColor="#1A7CC7" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="rg_bottom" cx="50%" cy="100%" r="50%">
            <Stop
              offset="0%"
              stopColor={dark ? "#0D1428" : "#D8E8F4"}
              stopOpacity={dark ? "0.80" : "0.50"}
            />
            <Stop offset="100%" stopColor={dark ? "#0D1428" : "#D8E8F4"} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#rg_fire)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#rg_ice)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#rg_bottom)" />
      </Svg>
    </View>
  );
});

export default AnimatedBackground;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
