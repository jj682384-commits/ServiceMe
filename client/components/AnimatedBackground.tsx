import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Polyline, Defs, RadialGradient, Stop } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

export const DARK_BG = "#04060E";
export const LIGHT_BG = "#F5F7FA";

const FPS_INTERVAL = 50;
const EKG_SPEED    = 5;

const BLUE_COLORS  = ["#0066FF", "#4499FF", "#00AAFF"];
const RED_COLORS   = ["#D92222", "#FF5500", "#FF2200"];
const WHITE_COLORS = ["#FFFFFF", "#CCDDFF"];

type ParticleKind = "blue" | "red" | "white";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  opacity: number;
  kind: ParticleKind;
  colorIdx: number;
}

interface AnimState {
  particles: Particle[];
  ekgOffset: number;
}

function initParticles(W: number, H: number): Particle[] {
  const out: Particle[] = [];
  const specs: [ParticleKind, number, number, number][] = [
    ["blue",  14, 3.5, 8  ],
    ["red",    8, 4,   10 ],
    ["white",  5, 2,   3.5],
  ];
  let idx = 0;
  for (const [kind, count, minR, maxR] of specs) {
    for (let i = 0; i < count; i++) {
      const speed = 0.30 + Math.random() * 0.42;
      const angle = Math.random() * Math.PI * 2;
      out.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: minR + Math.random() * (maxR - minR),
        opacity: kind === "white" ? 0.8 + Math.random() * 0.2 : 0.7 + Math.random() * 0.3,
        kind,
        colorIdx: idx,
      });
      idx++;
    }
  }
  return out;
}

function stepState(prev: AnimState, W: number, H: number): AnimState {
  const particles = prev.particles.map(p => {
    let x = p.x + p.vx;
    let y = p.y + p.vy;
    if (x < -20) x = W + 20;
    else if (x > W + 20) x = -20;
    if (y < -20) y = H + 20;
    else if (y > H + 20) y = -20;
    return { ...p, x, y };
  });
  const cycleLen = W * 0.55;
  const ekgOffset = (prev.ekgOffset + EKG_SPEED) % cycleLen;
  return { particles, ekgOffset };
}

function buildEkgPoints(W: number, Y: number, offsetX: number): string {
  const cycle = W * 0.55;
  const h = 30;
  const base: [number, number][] = [
    [0,             Y],
    [cycle * 0.22,  Y],
    [cycle * 0.28,  Y - h * 0.20],
    [cycle * 0.31,  Y - h],
    [cycle * 0.345, Y + h * 0.70],
    [cycle * 0.38,  Y],
    [cycle * 0.46,  Y - h * 0.14],
    [cycle * 0.50,  Y],
    [cycle * 0.72,  Y],
    [cycle * 0.78,  Y - h * 0.20],
    [cycle * 0.81,  Y - h],
    [cycle * 0.845, Y + h * 0.70],
    [cycle * 0.88,  Y],
    [cycle * 0.96,  Y - h * 0.14],
    [cycle,         Y],
  ];
  const pts: string[] = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (const [px, py] of base) {
      pts.push(`${px + rep * cycle - offsetX},${py}`);
    }
  }
  return pts.join(" ");
}

export default function AnimatedBackground() {
  const { width: W, height: H } = useWindowDimensions();

  const stateRef = useRef<AnimState>({ particles: initParticles(W, H), ekgOffset: 0 });
  const [renderState, setRenderState] = useState<AnimState>(stateRef.current);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dimsRef = useRef({ W, H });

  useEffect(() => {
    dimsRef.current = { W, H };
    stateRef.current = { particles: initParticles(W, H), ekgOffset: 0 };
    setRenderState({ ...stateRef.current });
  }, [W, H]);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    intervalRef.current = setInterval(() => {
      const { W: w, H: h } = dimsRef.current;
      stateRef.current = stepState(stateRef.current, w, h);
      setRenderState({ ...stateRef.current });
    }, FPS_INTERVAL);
  }, [stopAnimation]);

  useFocusEffect(useCallback(() => { startAnimation(); return stopAnimation; }, [startAnimation, stopAnimation]));
  useEffect(() => { return stopAnimation; }, [stopAnimation]);

  const { particles, ekgOffset } = renderState;

  const connections = useMemo(() => {
    const DIST = 190;
    const res: { x1: number; y1: number; x2: number; y2: number; alpha: number; isRed: boolean }[] = [];
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].kind === "white") continue;
      for (let j = i + 1; j < particles.length; j++) {
        if (particles[j].kind === "white") continue;
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < DIST) {
          const alpha = (1 - dist / DIST) * 0.52;
          res.push({
            x1: particles[i].x, y1: particles[i].y,
            x2: particles[j].x, y2: particles[j].y,
            alpha,
            isRed: particles[i].kind === "red" || particles[j].kind === "red",
          });
        }
      }
    }
    return res;
  }, [particles]);

  const ekgY   = H * 0.72;
  const ekgPts = buildEkgPoints(W, ekgY, ekgOffset);

  // Ambient glow circles — fire left, electric right
  // Use large radius relative to screen so both sides are clearly tinted
  const glowR = Math.max(W, H) * 0.70;
  const fireCx  = W * 0.12;
  const fireCy  = H * 0.35;
  const elecCx  = W * 0.88;
  const elecCy  = H * 0.30;

  return (
    <View style={styles.container} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {BLUE_COLORS.map((c, i) => (
            <RadialGradient key={`bg${i}`} id={`bg${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={c} stopOpacity="1"   />
              <Stop offset="40%"  stopColor={c} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={c} stopOpacity="0"   />
            </RadialGradient>
          ))}
          {RED_COLORS.map((c, i) => (
            <RadialGradient key={`rg${i}`} id={`rg${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor={c} stopOpacity="1"   />
              <Stop offset="40%"  stopColor={c} stopOpacity="0.5" />
              <Stop offset="100%" stopColor={c} stopOpacity="0"   />
            </RadialGradient>
          ))}
          <RadialGradient id="wg0" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Fire glow — upper-left, mirrors logo's red-cross half */}
        <Circle cx={fireCx} cy={fireCy} r={glowR * 1.00} fill="#FF4400" fillOpacity={0.07} />
        <Circle cx={fireCx} cy={fireCy} r={glowR * 0.65} fill="#FF4400" fillOpacity={0.10} />
        <Circle cx={fireCx} cy={fireCy} r={glowR * 0.38} fill="#FF5500" fillOpacity={0.16} />
        <Circle cx={fireCx} cy={fireCy} r={glowR * 0.20} fill="#FF6600" fillOpacity={0.22} />

        {/* Electric glow — upper-right, mirrors logo's blue-swirl half */}
        <Circle cx={elecCx} cy={elecCy} r={glowR * 1.00} fill="#0055FF" fillOpacity={0.07} />
        <Circle cx={elecCx} cy={elecCy} r={glowR * 0.65} fill="#0066FF" fillOpacity={0.10} />
        <Circle cx={elecCx} cy={elecCy} r={glowR * 0.38} fill="#0088FF" fillOpacity={0.16} />
        <Circle cx={elecCx} cy={elecCy} r={glowR * 0.20} fill="#00AAFF" fillOpacity={0.22} />

        {/* Connection arcs */}
        {connections.map((c, i) => (
          <Line key={`l${i}`}
            x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2}
            stroke={c.isRed ? "#FF5500" : "#0066FF"}
            strokeWidth={1.2}
            strokeOpacity={c.alpha}
          />
        ))}

        {/* Particles — large glow halo + bright core dot */}
        {particles.map((p, i) => {
          const glowParticleR = p.r * (p.kind === "white" ? 5 : 10);
          const colors = p.kind === "blue" ? BLUE_COLORS : p.kind === "red" ? RED_COLORS : WHITE_COLORS;
          const color  = colors[p.colorIdx % colors.length];
          const gradId = p.kind === "blue"  ? `bg${p.colorIdx % BLUE_COLORS.length}`
                       : p.kind === "red"   ? `rg${p.colorIdx % RED_COLORS.length}`
                       : "wg0";
          return (
            <React.Fragment key={`p${i}`}>
              <Circle cx={p.x} cy={p.y} r={glowParticleR} fill={`url(#${gradId})`} fillOpacity={p.opacity * 0.52} />
              <Circle cx={p.x} cy={p.y} r={p.r}           fill={color}             fillOpacity={p.opacity}         />
            </React.Fragment>
          );
        })}

        {/* EKG heartbeat line — synced with main loop, no Animated.View lag */}
        <Polyline points={ekgPts} stroke="#00AAFF" strokeWidth={4}   fill="none" strokeOpacity={0.25} />
        <Polyline points={ekgPts} stroke="#FFFFFF"  strokeWidth={1.8} fill="none" strokeOpacity={0.65} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
