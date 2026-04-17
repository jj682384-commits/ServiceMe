/**
 * AnimatedBackground — C + D hybrid
 *
 * Layer stack (bottom → top):
 *   1. Energy rain (D) — glowing vertical streaks, orange left / blue right
 *   2. Constellation (C) — 10 slow drifting particles with halos + arcs
 *   3. EKG heartbeat — single scrolling pulse line at the bottom
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Polyline, Rect, Defs, RadialGradient, LinearGradient, Stop } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

export const DARK_BG  = "#04060E";
export const LIGHT_BG = "#F5F7FA";

// ─── tunables ────────────────────────────────────────────────────────────────
const TICK_MS        = 33;    // 30 fps
const EKG_SPEED      = 1.8;
const PARTICLE_SPEED = 0.22;
const WOBBLE         = 0.008;
const ARC_DIST       = 180;

// Rain streaks — 32 total, equally split left/right
const STREAK_COUNT   = 32;
// Streak fall speed range (px per tick, downward)
const STREAK_SPD_MIN = 0.5;
const STREAK_SPD_MAX = 1.4;

// ─── particle definitions ────────────────────────────────────────────────────
type Kind = "blue" | "red" | "white";
const PDEFS: { kind: Kind; r: number; xBias: "left" | "right" | "any" }[] = [
  { kind: "blue",  r: 5.5, xBias: "right" },
  { kind: "blue",  r: 4,   xBias: "right" },
  { kind: "blue",  r: 6.5, xBias: "right" },
  { kind: "blue",  r: 3.5, xBias: "any"   },
  { kind: "blue",  r: 7,   xBias: "right" },
  { kind: "red",   r: 5,   xBias: "left"  },
  { kind: "red",   r: 6,   xBias: "left"  },
  { kind: "red",   r: 4,   xBias: "left"  },
  { kind: "white", r: 2.5, xBias: "any"   },
  { kind: "white", r: 2,   xBias: "any"   },
];

const DOT_COLOR: Record<Kind, string> = {
  blue:  "#00AAFF",
  red:   "#FF5500",
  white: "#FFFFFF",
};

// ─── types ───────────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; r: number; kind: Kind }
interface Streak {
  x: number; y: number;
  len: number; speed: number;
  coreOp: number; glowOp: number;
  fire: boolean; // true = left/orange, false = right/blue
}
interface Anim { particles: Particle[]; streaks: Streak[]; ekgOff: number }

// ─── initialise ──────────────────────────────────────────────────────────────
function makeState(W: number, H: number): Anim {
  const particles: Particle[] = PDEFS.map(d => {
    const angle = Math.random() * Math.PI * 2;
    const xRange = d.xBias === "left"  ? [0, W * 0.55]
                 : d.xBias === "right" ? [W * 0.45, W]
                 : [0, W];
    return {
      x:  xRange[0] + Math.random() * (xRange[1] - xRange[0]),
      y:  Math.random() * H,
      vx: Math.cos(angle) * PARTICLE_SPEED,
      vy: Math.sin(angle) * PARTICLE_SPEED,
      r: d.r, kind: d.kind,
    };
  });

  // Build streaks evenly split: first half fire, second half electric
  const streaks: Streak[] = Array.from({ length: STREAK_COUNT }, (_, i) => {
    const fire = i < STREAK_COUNT / 2;
    // Spread within their half, with slight random scatter
    const xMin = fire ? 0       : W * 0.50;
    const xMax = fire ? W * 0.50 : W;
    return {
      x:      xMin + Math.random() * (xMax - xMin),
      y:      Math.random() * H,           // start anywhere vertically
      len:    70 + Math.random() * 130,    // 70–200 px tall
      speed:  STREAK_SPD_MIN + Math.random() * (STREAK_SPD_MAX - STREAK_SPD_MIN),
      coreOp: 0.65 + Math.random() * 0.30, // 0.65–0.95 bright core
      glowOp: 0.20 + Math.random() * 0.15, // 0.20–0.35 wide glow
      fire,
    };
  });

  return { particles, streaks, ekgOff: 0 };
}

// ─── tick ────────────────────────────────────────────────────────────────────
function nextState(prev: Anim, W: number, H: number): Anim {
  // Particles: organic drift with tiny random-walk wobble
  const particles = prev.particles.map(p => {
    const nvx = p.vx + (Math.random() - 0.5) * WOBBLE * 2;
    const nvy = p.vy + (Math.random() - 0.5) * WOBBLE * 2;
    const spd = Math.sqrt(nvx * nvx + nvy * nvy);
    const sc  = spd > PARTICLE_SPEED * 1.6 ? (PARTICLE_SPEED * 1.6) / spd : 1;
    const vx  = nvx * sc, vy = nvy * sc;
    let x = p.x + vx, y = p.y + vy;
    if (x < -40) x = W + 40; else if (x > W + 40) x = -40;
    if (y < -40) y = H + 40; else if (y > H + 40) y = -40;
    return { ...p, x, y, vx, vy };
  });

  // Streaks: fall downward, wrap to top when they exit the bottom
  const streaks = prev.streaks.map(s => {
    let y = s.y + s.speed;
    if (y > H + s.len) y = -s.len;
    return { ...s, y };
  });

  const ekgOff = (prev.ekgOff + EKG_SPEED) % (W * 0.60);
  return { particles, streaks, ekgOff };
}

// ─── EKG path ────────────────────────────────────────────────────────────────
function buildEkg(W: number, Y: number, off: number): string {
  const C = W * 0.60;
  const h = 30;
  const seg: [number, number][] = [
    [0,          Y],
    [C * 0.18,   Y],
    [C * 0.26,   Y - h * 0.18],
    [C * 0.30,   Y],
    [C * 0.36,   Y - h * 0.10],
    [C * 0.40,   Y - h],
    [C * 0.44,   Y + h * 0.60],
    [C * 0.48,   Y],
    [C * 0.58,   Y - h * 0.22],
    [C * 0.66,   Y],
    [C,          Y],
  ];
  const pts: string[] = [];
  for (let rep = -1; rep <= 2; rep++)
    for (const [px, py] of seg) pts.push(`${px + rep * C - off},${py}`);
  return pts.join(" ");
}

// ─── component ───────────────────────────────────────────────────────────────
export default function AnimatedBackground({ showEkg = true }: { showEkg?: boolean }) {
  const { width: W, height: H } = useWindowDimensions();

  const stateRef  = useRef<Anim>(makeState(W, H));
  const dimsRef   = useRef({ W, H });
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [anim, setAnim] = useState<Anim>(stateRef.current);

  useEffect(() => {
    dimsRef.current  = { W, H };
    stateRef.current = makeState(W, H);
    setAnim({ ...stateRef.current });
  }, [W, H]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const start = useCallback(() => {
    stop();
    timerRef.current = setInterval(() => {
      const { W: w, H: h } = dimsRef.current;
      stateRef.current = nextState(stateRef.current, w, h);
      setAnim({ ...stateRef.current });
    }, TICK_MS);
  }, [stop]);

  useFocusEffect(useCallback(() => { start(); return stop; }, [start, stop]));
  useEffect(() => () => stop(), [stop]);

  // Connection arcs
  const arcs: { x1: number; y1: number; x2: number; y2: number; col: string; op: number }[] = [];
  const ps = anim.particles;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].kind === "white") continue;
    for (let j = i + 1; j < ps.length; j++) {
      if (ps[j].kind === "white") continue;
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < ARC_DIST) {
        arcs.push({
          x1: ps[i].x, y1: ps[i].y, x2: ps[j].x, y2: ps[j].y,
          col: (ps[i].kind === "red" || ps[j].kind === "red") ? "#FF5500" : "#0066FF",
          op:  (1 - d / ARC_DIST) * 0.40,
        });
      }
    }
  }

  const ekg = buildEkg(W, H * 0.92, anim.ekgOff);

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          <RadialGradient id="halo_blue" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#00AAFF" stopOpacity="1"   />
            <Stop offset="40%"  stopColor="#0066FF" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#0066FF" stopOpacity="0"   />
          </RadialGradient>
          <RadialGradient id="halo_red" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FF6600" stopOpacity="1"   />
            <Stop offset="40%"  stopColor="#FF4400" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#D92222" stopOpacity="0"   />
          </RadialGradient>
          <RadialGradient id="halo_white" cx="50%" cy="50%" r="50%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0"   />
          </RadialGradient>
          {/* Fade-out overlay for rain streaks — transparent at top, opaque bg at bottom */}
          <LinearGradient id="streakFade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%"   stopColor={DARK_BG} stopOpacity="0"   />
            <Stop offset="60%"  stopColor={DARK_BG} stopOpacity="0"   />
            <Stop offset="100%" stopColor={DARK_BG} stopOpacity="1"   />
          </LinearGradient>
        </Defs>

        {/* ── 1. Energy rain (Option D) ──
            Each streak drawn twice: wide glow pass + thin bright core.
            Fire/orange on the left half, electric/blue on the right half. */}
        {anim.streaks.map((sk, i) => {
          const fireCol = "#FF5500";
          const elecCol = "#0088FF";
          const col     = sk.fire ? fireCol : elecCol;
          const x2      = sk.x;
          const y1      = sk.y;
          const y2      = sk.y + sk.len;
          return (
            <React.Fragment key={`sk${i}`}>
              {/* outer glow */}
              <Line x1={x2} y1={y1} x2={x2} y2={y2}
                stroke={col} strokeWidth={9} strokeOpacity={sk.glowOp * 0.5} />
              {/* inner glow */}
              <Line x1={x2} y1={y1} x2={x2} y2={y2}
                stroke={col} strokeWidth={4} strokeOpacity={sk.glowOp} />
              {/* core */}
              <Line x1={x2} y1={y1} x2={x2} y2={y2}
                stroke={col} strokeWidth={1.8} strokeOpacity={sk.coreOp} />
            </React.Fragment>
          );
        })}

        {/* ── streak bottom-fade overlay (sits on top of streaks, under particles) ── */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#streakFade)" />

        {/* ── 2. Connection arcs (C) ── */}
        {arcs.map((a, i) => (
          <Line key={`a${i}`}
            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke={a.col} strokeWidth={1.0} strokeOpacity={a.op}
          />
        ))}

        {/* ── 3. Constellation particles (C) ── */}
        {anim.particles.map((p, i) => {
          const haloR = p.r * (p.kind === "white" ? 6 : 10);
          const hId   = p.kind === "blue" ? "halo_blue" : p.kind === "red" ? "halo_red" : "halo_white";
          return (
            <React.Fragment key={`p${i}`}>
              <Circle cx={p.x} cy={p.y} r={haloR} fill={`url(#${hId})`} fillOpacity={0.55} />
              <Circle cx={p.x} cy={p.y} r={p.r}   fill={DOT_COLOR[p.kind]}  fillOpacity={1}    />
            </React.Fragment>
          );
        })}

        {/* ── 4. EKG heartbeat (bottom) ── */}
        {showEkg && <>
          <Polyline points={ekg} stroke="#0066FF" strokeWidth={7}   fill="none" strokeOpacity={0.12} />
          <Polyline points={ekg} stroke="#00DDFF" strokeWidth={2.2} fill="none" strokeOpacity={0.50} />
          <Polyline points={ekg} stroke="#FFFFFF"  strokeWidth={1.2} fill="none" strokeOpacity={0.80} />
        </>}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
