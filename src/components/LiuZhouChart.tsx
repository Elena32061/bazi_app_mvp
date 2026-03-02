import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LiuZhouItem } from "../types";
import { fonts, palette, radius, spacing } from "../theme/tokens";

type Props = {
  items: LiuZhouItem[];
};

function colorByScore(score: number): string {
  if (score >= 85) {
    return "#1E5E52";
  }
  if (score >= 75) {
    return "#2E7D6E";
  }
  if (score >= 65) {
    return "#7A8F4A";
  }
  if (score >= 55) {
    return "#B88946";
  }
  return "#C4512D";
}

export default function LiuZhouChart({ items }: Props) {
  if (!items.length) {
    return null;
  }

  const maxScore = Math.max(...items.map((item) => item.score), 1);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {items.map((item) => {
        const height = Math.max(20, Math.round((item.score / maxScore) * 98));
        return (
          <View key={`liuzhou-${item.sequence}`} style={styles.col}>
            <Text style={styles.top}>{item.score}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { height, backgroundColor: colorByScore(item.score) }]} />
            </View>
            <Text style={styles.week}>W{item.sequence}</Text>
            <Text style={styles.gz}>{item.weekLabel}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.xs,
    paddingRight: spacing.sm
  },
  col: {
    width: 64,
    alignItems: "center"
  },
  top: {
    marginBottom: 3,
    fontSize: 11,
    color: palette.ink700,
    fontFamily: fonts.mono,
    fontWeight: "700"
  },
  track: {
    width: 26,
    height: 104,
    borderRadius: radius.sm,
    backgroundColor: "rgba(231,220,199,0.92)",
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  bar: {
    width: "100%",
    borderRadius: radius.sm
  },
  week: {
    marginTop: 6,
    fontSize: 11,
    color: palette.ink700,
    fontFamily: fonts.body,
    fontWeight: "700"
  },
  gz: {
    marginTop: 2,
    fontSize: 9,
    color: palette.ink500,
    fontFamily: fonts.body
  }
});
