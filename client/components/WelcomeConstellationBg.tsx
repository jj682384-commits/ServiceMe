import React, { useRef, useState, useEffect, useCallback } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

const N = 30;
const LINK_DIST = 180;
const TICK_MS = 66;

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; a: number;
  s: boolean;
}

function makePts(sw: number, sh: number): Particle[] {
  return Array.from({ length: N }, (_, i) => ({
    x: Math.random() * sw,
    y: Math.random() * sh,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 2.0 + 0.7,
    a: Math.random() * 0.38 + 0.12,
    s: i % 4 === 0,
  }));
}

export default function WelcomeConstellationBg({ isDark }: { isDark: boolean }) {
  const { width: SW, height: SH } = useWindowDimensions();
  const ptsRef = useRef<Particle[]>(makePts(SW, SH));
  const [, setTick] = useState(0);

  useEffect(() => {
    ptsRef.current = makePts(SW, SH);
  }, [SW, SH]);

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
  }, [SW, SH]);

  const pts = ptsRef.current;

  const mainRgb = isDark ? "255,255,255" : "30,30,30";
  const secRgb  = isDark ? "200,200,200" : "85,85,85";
  const lineRgb = isDark ? "192,192,192" : "45,45,45";
  const lineMax = isDark ? 0.09 : 0.18;
  const linePx  = isDark ? 0.55 : 0.75;

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
          const rgb = p.s ? secRgb : mainRgb;
          const a = Math.min(p.a * (isDark ? 1 : 1.6), 0.82).toFixed(3);
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
