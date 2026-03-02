import React from "react";
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from "react-native-svg";

type Props = {
  size?: number;
};

export default function LogoMark({ size = 48 }: Props) {
  const c = size / 2;
  const ring = size * 0.38;

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#2E7D6E" />
          <Stop offset="1" stopColor="#CDAA5B" />
        </LinearGradient>
      </Defs>
      <Circle cx={c} cy={c} r={c} fill="url(#bgGrad)" />
      <Circle cx={c} cy={c} r={ring} fill="none" stroke="rgba(255,253,248,0.92)" strokeWidth={size * 0.05} />
      <Line x1={c} y1={c - ring * 0.72} x2={c} y2={c + ring * 0.72} stroke="#FFFDF8" strokeWidth={size * 0.05} strokeLinecap="round" />
      <Line x1={c - ring * 0.72} y1={c} x2={c + ring * 0.72} y2={c} stroke="#CDAA5B" strokeWidth={size * 0.06} strokeLinecap="round" />
      <Path
        d={`M ${c - ring * 0.35} ${c - ring * 0.1} Q ${c} ${c - ring * 0.35} ${c + ring * 0.35} ${c - ring * 0.1}`}
        fill="none"
        stroke="#FFFDF8"
        strokeWidth={size * 0.05}
        strokeLinecap="round"
      />
    </Svg>
  );
}
