import React, { useEffect, useMemo, useState } from "react";
import Svg, { Circle, G, Line, Polygon, Rect, Text as SvgText } from "react-native-svg";
import { RadarMetric } from "../types";

type Props = {
  metrics: RadarMetric[];
  size?: number;
};

function toPoint(angle: number, radius: number, center: number) {
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle)
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export default function RadarChart({ metrics, size = 244 }: Props) {
  const center = size / 2;
  const maxRadius = size * 0.34;
  const count = metrics.length;

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!metrics.length) {
      setSelectedIndex(null);
      return;
    }

    let maxIdx = 0;
    let maxValue = metrics[0].value;
    metrics.forEach((metric, idx) => {
      if (metric.value > maxValue) {
        maxValue = metric.value;
        maxIdx = idx;
      }
    });

    setSelectedIndex(maxIdx);
  }, [metrics]);

  const data = useMemo(() => {
    if (!count) {
      return null;
    }

    const levels = [0.25, 0.5, 0.75, 1];
    const axisAngles = metrics.map((_, i) => -Math.PI / 2 + (i * Math.PI * 2) / count);

    const dataPoints = axisAngles.map((angle, i) => {
      const value = Math.max(0, Math.min(100, metrics[i].value));
      return {
        ...toPoint(angle, maxRadius * (value / 100), center),
        value
      };
    });

    return {
      levels,
      axisAngles,
      dataPoints,
      dataPath: dataPoints.map((p) => `${p.x},${p.y}`).join(" ")
    };
  }, [center, count, maxRadius, metrics]);

  if (!data || !count) {
    return null;
  }

  const hasSelected = selectedIndex !== null && selectedIndex >= 0 && selectedIndex < metrics.length;
  const selectedPoint = hasSelected ? data.dataPoints[selectedIndex] : null;
  const selectedMetric = hasSelected ? metrics[selectedIndex] : null;

  const bubbleWidth = 102;
  const bubbleHeight = 28;
  const bubbleX = selectedPoint ? clamp(selectedPoint.x - bubbleWidth / 2, 8, size - bubbleWidth - 8) : 0;
  const bubbleY = selectedPoint ? clamp(selectedPoint.y - 40, 6, size - bubbleHeight - 6) : 0;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.levels.map((level) => {
        const ringPoints = data.axisAngles
          .map((angle) => {
            const p = toPoint(angle, maxRadius * level, center);
            return `${p.x},${p.y}`;
          })
          .join(" ");

        return (
          <Polygon
            key={`ring-${level}`}
            points={ringPoints}
            fill="none"
            stroke="rgba(30,94,82,0.18)"
            strokeWidth={1}
          />
        );
      })}

      {data.axisAngles.map((angle, i) => {
        const p = toPoint(angle, maxRadius, center);
        const label = toPoint(angle, maxRadius + 18, center);
        const active = i === selectedIndex;
        return (
          <React.Fragment key={`axis-${metrics[i].label}`}>
            <Line x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(30,94,82,0.2)" strokeWidth={1} />
            <SvgText
              x={label.x}
              y={label.y}
              fill={active ? "#1E5E52" : "#3A332C"}
              fontSize="12"
              fontWeight={active ? "800" : "700"}
              textAnchor="middle"
              alignmentBaseline="middle"
              onPress={() => setSelectedIndex(i)}
            >
              {metrics[i].label}
            </SvgText>
          </React.Fragment>
        );
      })}

      <Polygon points={data.dataPath} fill="rgba(46,125,110,0.30)" stroke="#1E5E52" strokeWidth={2} />

      {data.dataPoints.map((point, i) => {
        const active = i === selectedIndex;
        return (
          <G key={`dot-${metrics[i].label}`} onPress={() => setSelectedIndex(i)}>
            {active ? <Circle cx={point.x} cy={point.y} r={8} fill="rgba(196,81,45,0.15)" /> : null}
            <Circle cx={point.x} cy={point.y} r={active ? 4.8 : 3.5} fill={active ? "#C4512D" : "#A04A2D"} />
          </G>
        );
      })}

      <Circle cx={center} cy={center} r={3} fill="#1F1C18" />

      {selectedPoint && selectedMetric ? (
        <G>
          <Rect x={bubbleX} y={bubbleY} width={bubbleWidth} height={bubbleHeight} rx={14} fill="rgba(20,17,14,0.92)" />
          <SvgText
            x={bubbleX + bubbleWidth / 2}
            y={bubbleY + 18}
            fill="#FFFDF8"
            fontSize="12"
            fontWeight="700"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {`${selectedMetric.label}: ${selectedMetric.value}`}
          </SvgText>
        </G>
      ) : null}
    </Svg>
  );
}
