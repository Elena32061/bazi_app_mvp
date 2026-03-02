import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { palette, radius, spacing } from "../theme/tokens";

type Props = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export default function GlassCard({ children, style }: Props) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255, 253, 248, 0.9)",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.60)",
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 3
  }
});
