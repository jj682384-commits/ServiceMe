import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Circle, Line, Defs, RadialGradient, Stop } from "react-native-svg";
import { useFocusEffect } from "@react-navigation/native";

const { width: W, height: H } = Dimensions.get("window");

const PARTICLE_COUNT = 32;
const CONNECT_DISTANCE = 180;
const FPS_INTERVAL = 50;

const DEFAULT_COLORS = ["#00D9FF", "#FF6B35", "#7B2FFF", "#00FFD4", "#FF006E", "#FFE000"];

export const DARK_BG = "#04081C";
export const LIGHT_BG = "#F0F2F5";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
  colorIndex: number;
}

interface AnimatedBackgroundProps {
  customColors?: string[][];
  opacityBoost?: number;
  flashColor?: string;
  isDark?: boolean;
}

function initParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const speed = 0.26 + Math.random() * 0.36;
    const angle = Math.random() * Math.PI * 2;
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.6 + Math.random() * 2.8,
      opacity: 0.55 + Math.random() * 0.45,
      colorIndex: i % DEFAULT_COLORS.length,
    };
  });
}

function stepParticles(prev: Particle[]): Particle[] {
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

export default function AnimatedBackground({
  customColors,
  opacityBoost = 1,
  isDark = true,
}: AnimatedBackgroundProps) {
  const [particles, setParticles] = useState<Particle[]>(initParticles);
  const particleRef = useRef<Particle[]>(particles);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAnimation = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startAnimation = useCallback(() => {
    stopAnimation();
    intervalRef.current = setInterval(() => {
      particleRef.current = stepParticles(particleRef.current);
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

  const palette: string[] = customColors
    ? customColors.map(pair => pair[0])
    : DEFAULT_COLORS;

  const primaryColor = palette[0];
  const opacityScale = Math.min(opacityBoost, 2.5);

  const connections: { x1: number; y1: number; x2: number; y2: number; alpha: number }[] = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECT_DISTANCE) {
        connections.push({
          x1: particles[i].x,
          y1: particles[i].y,
          x2: particles[j].x,
          y2: particles[j].y,
          alpha: (1 - dist / CONNECT_DISTANCE) * 0.28 * opacityScale,
        });
      }
    }
  }

  return (
    <View style={[styles.container, { pointerEvents: "none" }]}>
      <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
        <Defs>
          {palette.map((color, i) => (
            <RadialGradient
              key={`glow-${i}`}
              id={`glow${i}`}
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <Stop offset="0%" stopColor={color} stopOpacity="1" />
              <Stop offset="55%" stopColor={color} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          ))}
        </Defs>

        {connections.map((c, i) => (
          <Line
            key={`l${i}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={primaryColor}
            strokeWidth={0.9}
            strokeOpacity={c.alpha}
          />
        ))}

        {particles.map((p, i) => {
          const glowR = p.r * 5.5;
          const dotOpacity = p.opacity * opacityScale;
          const colorIdx = p.colorIndex % palette.length;
          return (
            <React.Fragment key={`p${i}`}>
              <Circle
                cx={p.x}
                cy={p.y}
                r={glowR}
                fill={`url(#glow${colorIdx})`}
                fillOpacity={dotOpacity * 0.4}
              />
              <Circle
                cx={p.x}
                cy={p.y}
                r={p.r}
                fill={palette[colorIdx]}
                fillOpacity={dotOpacity}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
