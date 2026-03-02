import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type ParticleConfig = {
  leftPct: number;
  size: number;
  durationMs: number;
  delayMs: number;
  driftX: number;
  opacity: number;
  color: string;
};

const colors = ["rgba(46,125,110,0.22)", "rgba(205,170,91,0.24)", "rgba(196,81,45,0.16)"];

function createConfig(index: number): ParticleConfig {
  return {
    leftPct: 6 + ((index * 17) % 88),
    size: 3 + (index % 4),
    durationMs: 7600 + ((index * 467) % 3200),
    delayMs: (index * 370) % 2400,
    driftX: (index % 2 === 0 ? 1 : -1) * (10 + (index % 5) * 6),
    opacity: 0.3 + (index % 4) * 0.1,
    color: colors[index % colors.length]
  };
}

type Props = {
  count?: number;
};

export default function ParticleFlow({ count = 16 }: Props) {
  const configs = useMemo(() => Array.from({ length: count }, (_, idx) => createConfig(idx)), [count]);
  const progress = useRef(configs.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = progress.map((value, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(configs[idx].delayMs),
          Animated.timing(value, {
            toValue: 1,
            duration: configs[idx].durationMs,
            easing: Easing.linear,
            useNativeDriver: true
          })
        ])
      )
    );

    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [configs, progress]);

  return (
    <View pointerEvents="none" style={styles.container}>
      {configs.map((cfg, idx) => {
        const motion = progress[idx];
        const translateY = motion.interpolate({
          inputRange: [0, 1],
          outputRange: [90, -820]
        });
        const translateX = motion.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, cfg.driftX, cfg.driftX * 0.35]
        });
        const opacity = motion.interpolate({
          inputRange: [0, 0.12, 0.82, 1],
          outputRange: [0, cfg.opacity, cfg.opacity * 0.55, 0]
        });

        return (
          <Animated.View
            key={`particle-${idx}`}
            style={[
              styles.dot,
              {
                left: `${cfg.leftPct}%`,
                width: cfg.size,
                height: cfg.size,
                borderRadius: cfg.size / 2,
                backgroundColor: cfg.color,
                opacity,
                transform: [{ translateY }, { translateX }]
              }
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject
  },
  dot: {
    position: "absolute",
    bottom: -24
  }
});
