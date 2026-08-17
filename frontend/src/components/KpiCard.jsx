import React from 'react';

export default function KpiCard({
  title,
  value,
  trendPct = null,
}) {
  const isPositive = trendPct > 0;
  const isNegative = trendPct < 0;

  return (
    <div className="flex flex-col py-1 font-sans">
      <span className="text-[12px] font-medium text-[#71717a] tracking-tight">{title}</span>
      <span className="text-3xl font-bold tracking-tight text-[#f4f4f5] mt-1">{value}</span>
      {trendPct !== null ? (
        <span className={`text-[11px] mt-1.5 font-medium ${isPositive ? 'text-[#10b981]' : isNegative ? 'text-[#ef4444]' : 'text-[#71717a]'}`}>
          {isPositive ? '↑' : isNegative ? '↓' : ''} {Math.abs(trendPct)}% <span className="text-[#71717a] font-normal">vs previous period</span>
        </span>
      ) : (
        <span className="text-[11px] text-[#71717a] mt-1.5 font-medium">Active</span>
      )}
    </div>
  );
}
