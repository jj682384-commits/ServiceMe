import React, { useRef, useState, useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

const { width: SW, height: SH } = Dimensions.get("window");
const N = 30;
const LINK_DIST = 180;
const TICK_MS = 66;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
  t: "m" | "r" | "b";
}

function makePts(): Particle[] {
  return Array.from({ length: N }, (_, i) => ({
    x: Math.random() * SW,
    y: Math.random() * SH,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2.2 + 0.8,
    a: Math.random() * 0.4 + 0.15,
    t: (i < 4 ? "r" : i < 8 ? "b" : "m") as "m" | "r" | "b",
  }));
}

export default function WelcomeConstellationBg({ isDark }: { isDark: boolean }) {
  const ptsRef = useRef<Particle[]>(makePts());
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      const arr = ptsRef.current;
      for (let k = 0; k < arr.length; k++) {
        arr[k].x += arr[k].vx;
        arr[k].y += arr[k].vy;
        if (arr[k].x < -10) arr[k].x = SW + 10;
        if (arr[k].x > SW + 10) arr[k].x = -10;
        if (arr[k].y < -10) arr[k].y = SH + 10;
        if (arr[k].y > SH + 10) arr[k].y = -10;
      }
      setTick((t) => t + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const pts = ptsRef.current;

  const mainRgb   = isDark ? "255,255,255"   : "25,45,130";
  const accentRgb = isDark ? "210,55,55"     : "165,25,25";
  const blueRgb   = isDark ? "90,155,255"    : "15,75,200";
  const lineRgb   = isDark ? "192,192,192"   : "25,55,155";
  const lineMax   = isDark ? 0.08            : 0.20;
  const linePx    = isDark ? 0.65            : 0.9;
  const aBoost    = isDark ? 1               : 1.7;

  const lines: React.ReactNode[] = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
      if (d < LINK_DIST) {
        const a = (lineMax * (1 - d / LINK_DIST)).toFixed(3);
        lines.push(
          <Line
            key={`${i}-${j}`}
            x1={pts[i].x} y1={pts[i].y}
            x2={pts[j].x} y2={pts[j].y}
            stroke={`rgba(${lineRgb},${a})`}
            strokeWidth={linePx}
          />
        );
      }
    }
  }

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width={SW} height={SH} style={StyleSheet.absoluteFillObject}>
        {lines}
        {pts.map((p, i) => {
          const rgb = p.t === "r" ? accentRgb : p.t === "b" ? blueRgb : mainRgb;
          const a = Math.min(p.a * aBoost, 0.85).toFixed(3);
          return (
            <Circle key={i} cx={p.x} cy={p.y} r={p.r}
              fill={`rgba(${rgb},${a})`} />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
