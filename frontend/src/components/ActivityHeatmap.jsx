import React from 'react';
import { Calendar, Clock } from 'lucide-react';

export default function ActivityHeatmap({ heatmapGrid = [] }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  // Find max value in grid for relative color intensity calculation
  let maxVal = 1;
  heatmapGrid.forEach((dayRow) => {
    dayRow.forEach((val) => {
      if (val > maxVal) maxVal = val;
    });
  });

  const getColorIntensity = (val) => {
    if (!val || val === 0) return 'bg-[#1A202C] border-[#1E293B]';
    const ratio = val / maxVal;
    if (ratio < 0.25) return 'bg-[#6366F1]/20 border-[#6366F1]/30';
    if (ratio < 0.5) return 'bg-[#6366F1]/40 border-[#6366F1]/50';
    if (ratio < 0.75) return 'bg-[#6366F1]/70 border-[#6366F1]/80';
    return 'bg-[#38BDF8] border-[#38BDF8] glow-primary';
  };

  return (
    <div className="bg-[#111620] border border-[#1E293B] rounded-xl p-5">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#38BDF8]" />
            Activity Heatmap (Peak Usage Times)
          </h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">Event volume density grouped by day of week & hour of day</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] font-mono">
          <span>Less</span>
          <div className="flex gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#1A202C] border border-[#334155]" />
            <span className="w-2.5 h-2.5 rounded bg-[#6366F1]/20" />
            <span className="w-2.5 h-2.5 rounded bg-[#6366F1]/50" />
            <span className="w-2.5 h-2.5 rounded bg-[#38BDF8]" />
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid Table Container */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Hour Headers */}
          <div className="grid grid-cols-25 gap-1 mb-1.5 text-[10px] font-mono text-[#64748B]">
            <div className="col-span-1 text-center font-bold">Day</div>
            {hours.map((h) => (
              <div key={h} className="col-span-1 text-center">
                {h % 4 === 0 ? (h === 0 ? '12a' : h === 12 ? '12p' : `${h > 12 ? h - 12 : h}${h >= 12 ? 'p' : 'a'}`) : ''}
              </div>
            ))}
          </div>

          {/* 7 Rows for Days */}
          {dayNames.map((dayLabel, dayIdx) => (
            <div key={dayLabel} className="grid grid-cols-25 gap-1 mb-1 items-center">
              <div className="col-span-1 text-[11px] font-mono font-semibold text-[#94A3B8] text-right pr-2">
                {dayLabel}
              </div>

              {hours.map((hourIdx) => {
                const count = heatmapGrid[dayIdx]?.[hourIdx] || 0;
                return (
                  <div
                    key={hourIdx}
                    title={`${dayLabel} ${hourIdx}:00 - ${count} events`}
                    className={`col-span-1 h-5 rounded border transition-all duration-300 hover:scale-110 cursor-pointer ${getColorIntensity(
                      count
                    )}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
