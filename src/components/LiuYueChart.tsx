import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { LiuYueItem } from "../types";
import { fonts, palette, radius, spacing } from "../theme/tokens";

type Props = {
  items: LiuYueItem[];
};

function toBarColor(score: number): string {
  if (score >= 82) {
    return "#1E5E52";
  }
  if (score >= 72) {
    return "#2E7D6E";
  }
  if (score >= 62) {
    return "#8B9A54";
  }
  if (score >= 52) {
    return "#B88946";
  }
  return "#C4512D";
}

export default function LiuYueChart({ items }: Props) {
  const maxScore = useMemo(() => Math.max(...items.map((item) => item.score), 1), [items]);

  if (!items.length) {
    return null;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {items.map((item) => {
        const height = Math.max(28, Math.round((item.score / maxScore) * 112));
        return (
          <View key={`liuyue-${item.year}-${item.monthIndex}`} style={styles.col}>
            <Text style={styles.score}>{item.score}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { height, backgroundColor: toBarColor(item.score) }]} />
            </View>
            <Text style={styles.month}>{item.monthLabel}</Text>
            <Text style={styles.gz}>{item.ganZhi}</Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: spacing.sm,
    paddingRight: spacing.sm
  },
  col: {
    width: 54,
    alignItems: "center"
  },
  score: {
    marginBottom: 4,
    fontSize: 12,
    color: palette.ink700,
    fontFamily: fonts.mono,
    fontWeight: "700"
  },
  track: {
    width: 30,
    height: 116,
    borderRadius: radius.sm,
    backgroundColor: "rgba(231,220,199,0.9)",
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  bar: {
    width: "100%",
    borderRadius: radius.sm
  },
  month: {
    marginTop: 6,
    fontSize: 12,
    color: palette.ink700,
    fontFamily: fonts.body,
    fontWeight: "700"
  },
  gz: {
    marginTop: 2,
    fontSize: 11,
    color: palette.ink500,
    fontFamily: fonts.body
  }
});
