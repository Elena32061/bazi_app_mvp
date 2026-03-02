import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: React.ReactNode;
};

export default function GradientBackground({ children }: Props) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 4500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
      ])
    );

    anim.start();
    return () => anim.stop();
  }, [drift]);

  const topTransform = useMemo(
    () => [
      {
        translateX: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 14]
        })
      },
      {
        translateY: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10]
        })
      }
    ],
    [drift]
  );

  const bottomTransform = useMemo(
    () => [
      {
        translateX: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -10]
        })
      },
      {
        translateY: drift.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 12]
        })
      }
    ],
    [drift]
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#F8F4EC", "#F2ECDE", "#E9DDC7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.glowTop, { transform: topTransform }]} />
      <Animated.View style={[styles.glowMid, { transform: bottomTransform }]} />
      <Animated.View style={[styles.glowBottom, { transform: bottomTransform }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  glowTop: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(205,170,91,0.22)"
  },
  glowMid: {
    position: "absolute",
    top: 160,
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(46,125,110,0.10)"
  },
  glowBottom: {
    position: "absolute",
    bottom: -90,
    left: 40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(46,125,110,0.12)"
  }
});
