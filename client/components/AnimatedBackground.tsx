import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Polyline, Defs, RadialGradient, Stop, LinearGradient as SvgLinearGradient, G } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";

export const DARK_BG = "#04060E";
export const LIGHT_BG = "#F5F7FA";

const FPS_INTERVAL = 50;

// Logo-matched color palette: electric blue, fire red, cyan, orange, white
const BLUE_COLORS  = ["#0066FF", "#4488FF", "#00AAFF"];
const RED_COLORS   = ["#D92222", "#FF5500", "#FF3300"];
const WHITE_COLORS = ["#FFFFFF", "#CCE4FF"];

type ParticleKind = "blue" | "red" | "white";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  kind: ParticleKind;
  colorIdx: number;
}

function initParticles(W: number, H: number): Particle[] {
  const particles: Particle[] = [];
  const counts: [ParticleKind, number][] = [["blue", 18], ["red", 9], ["white", 5]];
  let idx = 0;
  for (const [kind, count] of counts) {
    for (let i = 0; i < count; i++) {
      const speed = 0.22 + Math.random() * 0.32;
      const angle = Math.random() * Math.PI * 2;
      const colors = kind === "blue" ? BLUE_COLORS : kind === "red" ? RED_COLORS : WHITE_COLORS;
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: kind === "white" ? 1.2 + Math.random() * 1.4 : 1.8 + Math.random() * 2.6,
        opacity: kind === "white" ? 0.7 + Math.random() * 0.3 : 0.5 + Math.random() * 0.5,
        kind,
        colorIdx: idx % colors.length,
      });
      idx++;
    }
  }
  return particles;
}

function stepParticles(prev: Particle[], W: number, H: number): Particle[] {
  return prev.map(p => {
    let x = p.x + p.vx;
    let y = p.y + p.vy;
    if (x < -14) x = W + 14;
    else if (x > W + 14) x = -14;
    if (y < -14) y = H + 14;
    else if (y > H + 14) y = -14;
    return { ...p, x, y };
  });
}

// EKG polyline path as a percentage-based set of points
function buildEkgPoints(W: number, Y: number, offsetX: number): string {
  const cycle = W * 0.5;
  const h = 22;
  const pts: [number, number][] = [
    [0, Y],
    [cycle * 0.25, Y],
    [cycle * 0.30, Y - h * 0.3],
    [cycle * 0.33, Y - h],
    [cycle * 0.36, Y + h * 0.55],
    [cycle * 0.40, Y],
    [cycle * 0.48, Y - h * 0.15],
    [cycle * 0.52, Y],
    [cycle * 0.75, Y],
    [cycle * 0.80, Y - h * 0.3],
    [cycle * 0.83, Y - h],
    [cycle * 0.86, Y + h * 0.55],
    [cycle * 0.90, Y],
    [cycle * 0.98, Y - h * 0.15],
    [cycle, Y],
    [cycle + cycle * 0.25, Y],
    [cycle + cycle * 0.30, Y - h * 0.3],
    [cycle + cycle * 0.33, Y - h],
    [cycle + cycle * 0.36, Y + h * 0.55],
    [cycle + cycle * 0.40, Y],
    [cycle + cycle * 0.48, Y - h * 0.15],
    [cycle + cycle * 0.52, Y],
    [W * 2, Y],
  ];
  return pts.map(([px, py]) => `${px + offsetX},${py}`).join(" ");
}

function EKGLine({ W, H }: { W: number; H: number }) {
  const translateX = useSharedValue(0);
  const Y = H * 0.82;

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-W * 0.5, { duration: 3200, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(translateX);
  }, [W]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const pts = buildEkgPoints(W * 2, Y, 0);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animStyle, { pointerEvents: "none" }]}>
      <Svg width={W * 3} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <Defs>
          <SvgLinearGradient id="ekgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="#0066FF" stopOpacity="0" />
            <Stop offset="25%" stopColor="#00AAFF" stopOpacity="0.7" />
            <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="75%" stopColor="#00AAFF" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Polyline
          points={pts}
          stroke="url(#ekgGrad)"
          strokeWidth={1.5}
          fill="none"
          strokeOpacity={0.7}
        />
        <Polyline
          points={pts}
          stroke="#00AAFF"
          strokeWidth={0.5}
          fill="none"
          strokeOpacity={0.35}
        />
      </Svg>
    </Animated.View>
  );
}

export default function AnimatedBackground() {
  const { width: W, height: H } = useWindowDimensions();

  const [particles, setParticles] = useState<Particle[]>(() => initParticles(W, H));
  const particleRef = useRef<Particle[]>(particles);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dimsRef = useRef({ W, H });

  useEffect(() => {
    dimsRef.current = { W, H };
    particleRef.current = initParticles(W, H);
    setParticles([...particleRef.current]);
  }, [W, H]);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    intervalRef.current = setInterval(() => {
      const { W: w, H: h } = dimsRef.current;
      particleRef.current = stepParticles(particleRef.current, w, h);
      setParticles([...particleRef.current]);
    }, FPS_INTERVAL);
  }, [stopAnimation]);

  useFocusEffect(
    useCallback(() => {
      startAnimation();
      return stopAnimation;
    }, [startAnimation, stopAnimation])
  );

  useEffect(() => {
    return stopAnimation;
  }, [stopAnimation]);

  // Build connections between blue particles (electric arcs)
  const connections = useMemo(() => {
    const CONNECT_DISTANCE = 160;
    const result: { x1: number; y1: number; x2: number; y2: number; alpha: number; kind: ParticleKind }[] = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[i].kind === "white" && particles[j].kind === "white") continue;
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DISTANCE) {
          const alpha = (1 - dist / CONNECT_DISTANCE) * 0.30;
          const kind = particles[i].kind === "red" || particles[j].kind === "red" ? "red" : "blue";
          result.push({ x1: particles[i].x, y1: particles[i].y, x2: particles[j].x, y2: particles[j].y, alpha, kind });
        }
      }
    }
    return result;
  }, [particles]);

  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {BLUE_COLORS.map((c, i) => (
            <RadialGradient key={`bg${i}`} id={`bg${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={c} stopOpacity="1" />
              <Stop offset="50%" stopColor={c} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={c} stopOpacity="0" />
            </RadialGradient>
          ))}
          {RED_COLORS.map((c, i) => (
            <RadialGradient key={`rg${i}`} id={`rg${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={c} stopOpacity="1" />
              <Stop offset="50%" stopColor={c} stopOpacity="0.4" />
              <Stop offset="100%" stopColor={c} stopOpacity="0" />
            </RadialGradient>
          ))}
          <RadialGradient id="wg0" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {connections.map((c, i) => (
          <Line
            key={`l${i}`}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke={c.kind === "red" ? "#FF5500" : "#0066FF"}
            strokeWidth={0.8}
            strokeOpacity={c.alpha}
          />
        ))}

        {particles.map((p, i) => {
          const glowR = p.r * (p.kind === "white" ? 3 : 5);
          const colors = p.kind === "blue" ? BLUE_COLORS : p.kind === "red" ? RED_COLORS : WHITE_COLORS;
          const color = colors[p.colorIdx % colors.length];
          const gradId = p.kind === "blue" ? `bg${p.colorIdx % BLUE_COLORS.length}`
            : p.kind === "red" ? `rg${p.colorIdx % RED_COLORS.length}`
            : "wg0";
          return (
            <G key={`p${i}`}>
              <Circle cx={p.x} cy={p.y} r={glowR} fill={`url(#${gradId})`} fillOpacity={p.opacity * 0.35} />
              <Circle cx={p.x} cy={p.y} r={p.r} fill={color} fillOpacity={p.opacity} />
            </G>
          );
        })}
      </Svg>

      <EKGLine W={W} H={H} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
