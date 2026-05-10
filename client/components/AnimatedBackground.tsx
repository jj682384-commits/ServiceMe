import React from "react";
import { StyleSheet, useColorScheme, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

export const DARK_BG  = "#000000";
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

  if (!dark) {
    return <View style={[styles.root, { backgroundColor: bg }]} pointerEvents="none" />;
  }

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
          {/* Subtle chrome silver glow — top-left */}
          <RadialGradient id="rg_chrome_tl" cx="0%" cy="0%" r="55%">
            <Stop offset="0%"   stopColor="#C0C0C0" stopOpacity="0.07" />
            <Stop offset="100%" stopColor="#C0C0C0" stopOpacity="0"   />
          </RadialGradient>
          {/* Subtle chrome glow — bottom-right */}
          <RadialGradient id="rg_chrome_br" cx="100%" cy="100%" r="50%">
            <Stop offset="0%"   stopColor="#A0A0A0" stopOpacity="0.05" />
            <Stop offset="100%" stopColor="#A0A0A0" stopOpacity="0"   />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#rg_chrome_tl)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#rg_chrome_br)" />
      </Svg>
    </View>
  );
});

export default AnimatedBackground;

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
