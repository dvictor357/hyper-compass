"use client";

import type { RiskFactor } from "@/lib/pipeline-data";

interface RiskRadarProps {
  factors: RiskFactor[];
  grade: string;
  score: number;
  size?: number;
}

const GRADE_COLORS: Record<string, { fill: string; stroke: string }> = {
  A: { fill: "rgba(0, 255, 136, 0.15)", stroke: "#00ff88" },
  B: { fill: "rgba(68, 136, 255, 0.15)", stroke: "#4488ff" },
  C: { fill: "rgba(255, 159, 28, 0.15)", stroke: "#ff9f1c" },
  D: { fill: "rgba(255, 51, 102, 0.15)", stroke: "#ff3366" },
  F: { fill: "rgba(255, 0, 0, 0.15)", stroke: "#ff0000" },
};

export function RiskRadar({ factors, grade, score, size = 220 }: RiskRadarProps) {
  const center = size / 2;
  const maxR = size / 2 - 30;
  const n = factors.length;
  const step = (2 * Math.PI) / n;
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.C;

  const pt = (i: number, v: number) => {
    const a = i * step - Math.PI / 2;
    const r = (v / 10) * maxR;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };

  const dataPts = factors.map((f, i) => pt(i, f.score));
  const dataPath = dataPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
  const gridLevels = [2, 4, 6, 8, 10];

  return (
    <div className="relative inline-flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${grade}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) => pt(i, level));
          const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";
          return <path key={level} d={path} fill="none" stroke="rgba(26, 34, 64, 0.6)" strokeWidth="0.5" />;
        })}

        {factors.map((_, i) => {
          const end = pt(i, 10);
          return <line key={`axis-${i}`} x1={center} y1={center} x2={end.x} y2={end.y} stroke="rgba(26, 34, 64, 0.4)" strokeWidth="0.5" />;
        })}

        <path d={dataPath} fill={colors.fill} stroke={colors.stroke} strokeWidth="1.5" filter={`url(#glow-${grade})`} />

        {dataPts.map((point, i) => (
          <circle key={`dot-${i}`} cx={point.x} cy={point.y} r={factors[i].pass ? 3 : 2} fill={factors[i].pass ? colors.stroke : "#ff3366"} />
        ))}

        {factors.map((factor, i) => {
          const lp = pt(i, 12);
          return (
            <text key={`label-${i}`} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" className="fill-[#e0e6f0]/50 text-[8px] font-mono">
              {factor.name}
            </text>
          );
        })}

        <text x={center} y={center - 8} textAnchor="middle" className="fill-current text-2xl font-mono font-bold" style={{ fill: colors.stroke }}>
          {grade}
        </text>
        <text x={center} y={center + 10} textAnchor="middle" className="fill-[#e0e6f0]/50 text-[10px] font-mono">
          {score}/10
        </text>
      </svg>
    </div>
  );
}
