import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Polyline, Defs, RadialGradient, Stop } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

export const DARK_BG  = "#04060E";
export const LIGHT_BG = "#F5F7FA";

// ─── tunables ──────────────────────────────────────────────────────────────
const TICK_MS        = 66;   // ~15 fps — light on JS thread
const EKG_SPEED      = 3.5;
const PARTICLE_SPEED = 0.18; // very slow drift
const ARC_DIST       = 200;  // connection threshold

// Option-C particles: 5 blue, 3 red, 2 white  (total 10)
const PARTICLE_DEFS: { kind: "blue" | "red" | "white"; r: number }[] = [
  { kind: "blue",  r: 5   },
  { kind: "blue",  r: 3.5 },
  { kind: "blue",  r: 6   },
  { kind: "blue",  r: 4   },
  { kind: "blue",  r: 7   },
  { kind: "red",   r: 5.5 },
  { kind: "red",   r: 4   },
  { kind: "red",   r: 6.5 },
  { kind: "white", r: 2.5 },
  { kind: "white", r: 2   },
];

// Option-D streaks: thin drifting energy lines
const STREAK_COUNT = 8;

// ─── colour maps ───────────────────────────────────────────────────────────
const COLOR: Record<"blue" | "red" | "white", string> = {
  blue:  "#00AAFF",
  red:   "#FF4400",
  white: "#FFFFFF",
};
const HALO_COLOR: Record<"blue" | "red" | "white", string> = {
  blue:  "#0066FF",
  red:   "#D92222",
  white: "#CCDDFF",
};

// ─── types ─────────────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; kind: "blue" | "red" | "white";
}

interface Streak {
  x: number; y: number; len: number;
  speed: number; opacity: number;
  color: string;
}

interface State {
  particles: Particle[];
  streaks:   Streak[];
  ekgOff:    number;
}

// ─── init ──────────────────────────────────────────────────────────────────
function make(W: number, H: number): State {
  const particles: Particle[] = PARTICLE_DEFS.map(d => {
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W, y: Math.random() * H,
      vx: Math.cos(angle) * PARTICLE_SPEED,
      vy: Math.sin(angle) * PARTICLE_SPEED,
      r: d.r, kind: d.kind,
    };
  });

  const streaks: Streak[] = Array.from({ length: STREAK_COUNT }, () => ({
    x:       Math.random() * W,
    y:       Math.random() * H,
    len:     60 + Math.random() * 120,
    speed:   0.25 + Math.random() * 0.35,
    opacity: 0.04 + Math.random() * 0.09,
    color:   Math.random() < 0.55 ? "#0066FF" : "#FF4400",
  }));

  return { particles, streaks, ekgOff: 0 };
}

function tick(prev: State, W: number, H: number): State {
  const particles = prev.particles.map(p => {
    let { x, y, vx, vy } = p;
    x += vx; y += vy;
    if (x < -30) x = W + 30; else if (x > W + 30) x = -30;
    if (y < -30) y = H + 30; else if (y > H + 30) y = -30;
    return { ...p, x, y };
  });

  // streaks drift upward slowly
  const streaks = prev.streaks.map(s => {
    let y = s.y - s.speed;
    if (y + s.len < 0) y = H + s.len;
    return { ...s, y };
  });

  const ekgOff = (prev.ekgOff + EKG_SPEED) % (W * 0.55);
  return { particles, streaks, ekgOff };
}

// ─── EKG polyline ──────────────────────────────────────────────────────────
function ekgPoints(W: number, Y: number, off: number): string {
  const cycle = W * 0.55;
  const h = 28;
  const seg: [number, number][] = [
    [0,            Y],
    [cycle * 0.22, Y],
    [cycle * 0.28, Y - h * 0.18],
    [cycle * 0.31, Y - h],
    [cycle * 0.345,Y + h * 0.65],
    [cycle * 0.38, Y],
    [cycle * 0.46, Y - h * 0.12],
    [cycle * 0.50, Y],
    [cycle * 0.72, Y],
    [cycle * 0.78, Y - h * 0.18],
    [cycle * 0.81, Y - h],
    [cycle * 0.845,Y + h * 0.65],
    [cycle * 0.88, Y],
    [cycle * 0.96, Y - h * 0.12],
    [cycle,        Y],
  ];
  const pts: string[] = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (const [px, py] of seg) pts.push(`${px + rep * cycle - off},${py}`);
  }
  return pts.join(" ");
}

// ─── component ─────────────────────────────────────────────────────────────
export default function AnimatedBackground() {
  const { width: W, height: H } = useWindowDimensions();

  const stateRef   = useRef<State>(make(W, H));
  const dimsRef    = useRef({ W, H });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [s, setS]  = useState<State>(stateRef.current);

  useEffect(() => {
    dimsRef.current = { W, H };
    stateRef.current = make(W, H);
    setS({ ...stateRef.current });
  }, [W, H]);

  const stop  = useCallback(() => {
    if (intervalRef.current !== null) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    intervalRef.current = setInterval(() => {
      const { W: w, H: h } = dimsRef.current;
      stateRef.current = tick(stateRef.current, w, h);
      setS({ ...stateRef.current });
    }, TICK_MS);
  }, [stop]);

  useFocusEffect(useCallback(() => { start(); return stop; }, [start, stop]));
  useEffect(() => () => stop(), [stop]);

  // connection arcs (O(n²) but n=10 so trivially fast)
  const arcs: { x1: number; y1: number; x2: number; y2: number; col: string; a: number }[] = [];
  for (let i = 0; i < s.particles.length; i++) {
    if (s.particles[i].kind === "white") continue;
    for (let j = i + 1; j < s.particles.length; j++) {
      if (s.particles[j].kind === "white") continue;
      const dx = s.particles[i].x - s.particles[j].x;
      const dy = s.particles[i].y - s.particles[j].y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < ARC_DIST) {
        const a = (1 - d / ARC_DIST) * 0.45;
        const isRed = s.particles[i].kind === "red" || s.particles[j].kind === "red";
        arcs.push({ x1: s.particles[i].x, y1: s.particles[i].y, x2: s.particles[j].x, y2: s.particles[j].y, col: isRed ? "#FF4400" : "#0066FF", a });
      }
    }
  }

  const ekgY = H * 0.74;
  const ekg  = ekgPoints(W, ekgY, s.ekgOff);

  // ambient glow radius — fits nicely on any phone width
  const gr = W * 0.52;

  return (
    <View style={st.root} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id="gh_blue" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#0066FF" stopOpacity="1" />
            <Stop offset="45%"  stopColor="#0066FF" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#0066FF" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gh_red" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FF4400" stopOpacity="1" />
            <Stop offset="45%"  stopColor="#FF4400" stopOpacity="0.4" />
            <Stop offset="100%" stopColor="#FF4400" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="gh_white" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* ── Option-D sprinkle: drifting energy streaks ── */}
        {s.streaks.map((sk, i) => (
          <Line key={`sk${i}`}
            x1={sk.x} y1={sk.y}
            x2={sk.x} y2={sk.y + sk.len}
            stroke={sk.color}
            strokeWidth={1}
            strokeOpacity={sk.opacity}
          />
        ))}

        {/* ── Ambient split: fire left / electric right ── */}
        {/* fire — 3 concentric rings, upper-left */}
        <Circle cx={W * 0.10} cy={H * 0.30} r={gr * 1.0} fill="#FF4400" fillOpacity={0.05} />
        <Circle cx={W * 0.10} cy={H * 0.30} r={gr * 0.60} fill="#FF4400" fillOpacity={0.07} />
        <Circle cx={W * 0.10} cy={H * 0.30} r={gr * 0.30} fill="#FF6600" fillOpacity={0.11} />
        {/* electric — 3 concentric rings, upper-right */}
        <Circle cx={W * 0.90} cy={H * 0.25} r={gr * 1.0} fill="#0055FF" fillOpacity={0.05} />
        <Circle cx={W * 0.90} cy={H * 0.25} r={gr * 0.60} fill="#0066FF" fillOpacity={0.07} />
        <Circle cx={W * 0.90} cy={H * 0.25} r={gr * 0.30} fill="#00AAFF" fillOpacity={0.11} />

        {/* ── Option-C: connection arcs ── */}
        {arcs.map((a, i) => (
          <Line key={`a${i}`} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke={a.col} strokeWidth={1.0} strokeOpacity={a.a} />
        ))}

        {/* ── Option-C: constellation particles ── */}
        {s.particles.map((p, i) => {
          const glowR = p.r * (p.kind === "white" ? 6 : 11);
          const gId   = p.kind === "blue" ? "gh_blue" : p.kind === "red" ? "gh_red" : "gh_white";
          return (
            <React.Fragment key={`p${i}`}>
              <Circle cx={p.x} cy={p.y} r={glowR} fill={`url(#${gId})`} fillOpacity={0.50} />
              <Circle cx={p.x} cy={p.y} r={p.r}   fill={COLOR[p.kind]}  fillOpacity={0.95} />
            </React.Fragment>
          );
        })}

        {/* ── EKG heartbeat ── */}
        {/* glow pass */}
        <GlowPoly points={ekg} stroke="#0066FF" width={6} opacity={0.15} />
        {/* bright line */}
        <GlowPoly points={ekg} stroke="#FFFFFF"  width={1.6} opacity={0.70} />
      </Svg>
    </View>
  );
}

function GlowPoly({ points, stroke, width, opacity }: { points: string; stroke: string; width: number; opacity: number }) {
  return <Polyline points={points} stroke={stroke} strokeWidth={width} fill="none" strokeOpacity={opacity} />;
}

const st = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
