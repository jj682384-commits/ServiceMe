import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";

export default function EVAnimatedBackground({ isDark = true }: { isDark?: boolean }) {
  const bg = isDark ? "#020A06" : "#F0F8F4";

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
          <RadialGradient id="ev_green" cx="14%" cy="20%" r="52%">
            <Stop
              offset="0%"
              stopColor="#00CC6A"
              stopOpacity={isDark ? "0.22" : "0.10"}
            />
            <Stop offset="100%" stopColor="#00CC6A" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ev_cyan" cx="86%" cy="25%" r="52%">
            <Stop
              offset="0%"
              stopColor="#00E5FF"
              stopOpacity={isDark ? "0.20" : "0.09"}
            />
            <Stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="ev_purple" cx="50%" cy="85%" r="48%">
            <Stop
              offset="0%"
              stopColor="#7C3AED"
              stopOpacity={isDark ? "0.18" : "0.07"}
            />
            <Stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#ev_green)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#ev_cyan)" />
        <Rect x="0" y="0" width="100" height="100" fill="url(#ev_purple)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
