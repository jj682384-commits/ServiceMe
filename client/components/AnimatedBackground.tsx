/**
 * AnimatedBackground  — C+D hybrid
 *
 * Layer stack (bottom → top):
 *   1. Ambient glow split  — large soft circles: fire-orange left, electric-blue right
 *   2. Energy streaks (D)  — thin vertical lines rising slowly, pinned to their side
 *   3. Constellation (C)   — 10 slow particles with radial-gradient halos + connection arcs
 *   4. EKG heartbeat       — scrolling pulse line through the vertical midpoint
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, {
  Circle, Line, Polyline,
  Defs, RadialGradient, Stop,
} from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

export const DARK_BG  = "#04060E";
export const LIGHT_BG = "#F5F7FA";

// ─── tunables ────────────────────────────────────────────────────────────────
const TICK_MS        = 66;  // ~15 fps — keeps the JS thread relaxed
const EKG_SPEED      = 3.2;
const PARTICLE_SPEED = 0.15;
const ARC_DIST       = 180;

// ─── particle definitions (10 total) ─────────────────────────────────────────
// Red particles bias to the left half; blue to the right half.
// Radius is the bright core dot — the halo is 10× larger.
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

// ─── streak definitions (D sprinkle) ─────────────────────────────────────────
const STREAK_COUNT = 9;

// ─── types ───────────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; r: number; kind: Kind }
interface Streak   { x: number; y: number; len: number; speed: number; op: number; fire: boolean }
interface Anim     { particles: Particle[]; streaks: Streak[]; ekgOff: number }

// ─── colour lookup ───────────────────────────────────────────────────────────
const DOT_COLOR: Record<Kind, string> = {
  blue:  "#00AAFF",
  red:   "#FF5500",
  white: "#FFFFFF",
};

// ─── initialise ──────────────────────────────────────────────────────────────
function makeState(W: number, H: number): Anim {
  const particles: Particle[] = PDEFS.map(d => {
    const angle = Math.random() * Math.PI * 2;
    // bias x-start to the correct half, but allow drifting anywhere
    const xRange = d.xBias === "left"  ? [0, W * 0.55]
                 : d.xBias === "right" ? [W * 0.45, W]
                 : [0, W];
    const x = xRange[0] + Math.random() * (xRange[1] - xRange[0]);
    return {
      x,
      y:  Math.random() * H,
      vx: Math.cos(angle) * PARTICLE_SPEED,
      vy: Math.sin(angle) * PARTICLE_SPEED,
      r: d.r, kind: d.kind,
    };
  });

  const streaks: Streak[] = Array.from({ length: STREAK_COUNT }, (_, i) => {
    // alternate sides cleanly: even index = left (fire), odd = right (electric)
    const fire = i % 2 === 0;
    const xMin = fire ? 0 : W * 0.5;
    const xMax = fire ? W * 0.5 : W;
    return {
      x:     xMin + Math.random() * (xMax - xMin),
      y:     Math.random() * H,
      len:   55 + Math.random() * 110,
      speed: 0.20 + Math.random() * 0.30,
      op:    0.05 + Math.random() * 0.10,
      fire,
    };
  });

  return { particles, streaks, ekgOff: 0 };
}

// ─── tick ────────────────────────────────────────────────────────────────────
function nextState(prev: Anim, W: number, H: number): Anim {
  const particles = prev.particles.map(p => {
    let { x, y, vx, vy } = p;
    x += vx; y += vy;
    if (x < -40) x = W + 40; else if (x > W + 40) x = -40;
    if (y < -40) y = H + 40; else if (y > H + 40) y = -40;
    return { ...p, x, y };
  });

  const streaks = prev.streaks.map(s => {
    let y = s.y - s.speed;
    if (y + s.len < 0) y = H + s.len;
    return { ...s, y };
  });

  const ekgOff = (prev.ekgOff + EKG_SPEED) % (W * 0.60);
  return { particles, streaks, ekgOff };
}

// ─── EKG path builder ────────────────────────────────────────────────────────
function buildEkg(W: number, Y: number, off: number): string {
  const C = W * 0.60; // cycle length — a bit wider so fewer spikes per screen
  const h = 30;
  // one cardiac cycle: flat → P-wave bump → QRS spike → T-wave → flat
  const seg: [number, number][] = [
    [0,          Y],
    [C * 0.18,   Y],
    [C * 0.26,   Y - h * 0.18],   // P-wave
    [C * 0.30,   Y],
    [C * 0.36,   Y - h * 0.10],   // pre-QRS
    [C * 0.40,   Y - h],          // R peak
    [C * 0.44,   Y + h * 0.60],   // S trough
    [C * 0.48,   Y],
    [C * 0.58,   Y - h * 0.22],   // T-wave
    [C * 0.66,   Y],
    [C,          Y],
  ];
  const pts: string[] = [];
  for (let rep = -1; rep <= 2; rep++) {
    for (const [px, py] of seg) pts.push(`${px + rep * C - off},${py}`);
  }
  return pts.join(" ");
}

// ─── component ───────────────────────────────────────────────────────────────
export default function AnimatedBackground() {
  const { width: W, height: H } = useWindowDimensions();

  const stateRef    = useRef<Anim>(makeState(W, H));
  const dimsRef     = useRef({ W, H });
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // compute arcs (n=10 → 45 pairs max, trivially fast)
  const arcs: { x1: number; y1: number; x2: number; y2: number; col: string; op: number }[] = [];
  const ps = anim.particles;
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].kind === "white") continue;
    for (let j = i + 1; j < ps.length; j++) {
      if (ps[j].kind === "white") continue;
      const dx = ps[i].x - ps[j].x, dy = ps[i].y - ps[j].y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d < ARC_DIST) {
        const op  = (1 - d / ARC_DIST) * 0.40;
        const col = (ps[i].kind === "red" || ps[j].kind === "red") ? "#FF5500" : "#0066FF";
        arcs.push({ x1: ps[i].x, y1: ps[i].y, x2: ps[j].x, y2: ps[j].y, col, op });
      }
    }
  }

  // EKG at 12 % (above the card) and 84 % (below the card) so it's visible on every screen
  const ekgTop = buildEkg(W, H * 0.12, anim.ekgOff);
  const ekgBot = buildEkg(W, H * 0.84, anim.ekgOff);

  // ambient glow radius — large enough to clearly tint each half of the screen
  const GR = W * 0.75;

  return (
    <View style={styles.root} pointerEvents="none">
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {/* particle halo gradients */}
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
        </Defs>

        {/* ── 1. Ambient split glow ──
              Centred at W*0.25 (fire) and W*0.75 (electric) so the glow
              radiates clearly across each half without overflowing badly. */}
        {/* fire – left half */}
        <Circle cx={W * 0.25} cy={H * 0.38} r={GR * 1.00} fill="#FF4400" fillOpacity={0.06} />
        <Circle cx={W * 0.25} cy={H * 0.38} r={GR * 0.60} fill="#FF4400" fillOpacity={0.08} />
        <Circle cx={W * 0.25} cy={H * 0.38} r={GR * 0.28} fill="#FF6600" fillOpacity={0.13} />
        {/* electric – right half */}
        <Circle cx={W * 0.75} cy={H * 0.32} r={GR * 1.00} fill="#0055FF" fillOpacity={0.06} />
        <Circle cx={W * 0.75} cy={H * 0.32} r={GR * 0.60} fill="#0066FF" fillOpacity={0.08} />
        <Circle cx={W * 0.75} cy={H * 0.32} r={GR * 0.28} fill="#00AAFF" fillOpacity={0.13} />

        {/* ── 2. Energy streaks (D sprinkle) ──
              Thin vertical lines drifting upward — fire side = orange, electric side = blue */}
        {anim.streaks.map((sk, i) => (
          <Line key={`sk${i}`}
            x1={sk.x} y1={sk.y}
            x2={sk.x} y2={sk.y + sk.len}
            stroke={sk.fire ? "#FF5500" : "#0077FF"}
            strokeWidth={1.2}
            strokeOpacity={sk.op}
          />
        ))}

        {/* ── 3. Connection arcs ── */}
        {arcs.map((a, i) => (
          <Line key={`a${i}`}
            x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
            stroke={a.col} strokeWidth={1.0} strokeOpacity={a.op}
          />
        ))}

        {/* ── 4. Constellation particles ──
              Each particle: large soft halo (10× core radius) + bright core dot */}
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

        {/* ── 5. EKG heartbeat — top + bottom lines, both visible above/below card ── */}
        {[ekgTop, ekgBot].map((pts, i) => (
          <React.Fragment key={`ekg${i}`}>
            <Polyline points={pts} stroke="#0066FF" strokeWidth={7}   fill="none" strokeOpacity={0.12} />
            <Polyline points={pts} stroke="#00DDFF" strokeWidth={2.2} fill="none" strokeOpacity={0.50} />
            <Polyline points={pts} stroke="#FFFFFF"  strokeWidth={1.2} fill="none" strokeOpacity={0.80} />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
});
