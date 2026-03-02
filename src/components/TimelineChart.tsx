import React from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";
import { TimelinePoint } from "../types";
import { fonts, palette, spacing, typography } from "../theme/tokens";

type Props = {
  points: TimelinePoint[];
};

export default function TimelineChart({ points }: Props) {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(260, Math.min(360, width - 96));
  const chartHeight = 132;

  if (!points.length) {
    return null;
  }

  const minScore = 35;
  const maxScore = 100;

  const xStep = chartWidth / Math.max(points.length - 1, 1);

  const coords = points.map((item, i) => {
    const x = i * xStep;
    const y = chartHeight - ((item.score - minScore) / (maxScore - minScore)) * (chartHeight - 24) - 12;
    return { x, y, label: item.label, score: item.score, theme: item.theme };
  });

  const polyline = coords.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        <Polyline points={polyline} fill="none" stroke="#1E5E52" strokeWidth={3} strokeLinecap="round" />
        {coords.map((p) => (
          <Circle key={`${p.label}-dot`} cx={p.x} cy={p.y} r={4} fill="#C4512D" />
        ))}
      </Svg>

      <View style={styles.labelsRow}>
        {coords.map((p) => (
          <View key={`${p.label}-meta`} style={styles.metaCell}>
            <Text style={styles.month}>{p.label}</Text>
            <Text style={styles.score}>{p.score}</Text>
            <Text style={styles.theme}>{p.theme}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs
  },
  metaCell: {
    alignItems: "center",
    width: 52
  },
  month: {
    color: palette.ink700,
    fontSize: typography.caption,
    fontFamily: fonts.body
  },
  score: {
    color: palette.vermilion500,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: fonts.mono
  },
  theme: {
    color: palette.ink500,
    fontSize: 11,
    marginTop: 1,
    fontFamily: fonts.body
  }
});
