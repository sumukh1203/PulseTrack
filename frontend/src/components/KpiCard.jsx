import React from 'react';

export default function KpiCard({ title, value, subtext, trend, icon: Icon, color = 'indigo' }) {
  const colorMap = {
    indigo: 'text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/20',
    cyan: 'text-[#38BDF8] bg-[#38BDF8]/10 border-[#38BDF8]/20',
    emerald: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20',
    amber: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20',
  };

  return (
    <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-5 flex flex-col justify-between hover:border-[#334155] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
            {title}
          </span>
          <div className="mt-2 text-2xl font-bold font-mono text-[#F8FAFC]">
            {value}
          </div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${colorMap[color] || colorMap.indigo}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-4 pt-3 border-t border-[#1E293B] flex items-center justify-between text-xs">
          {subtext && <span className="text-[#94A3B8]">{subtext}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.startsWith('+') || trend.includes('Nominal') || trend.includes('Operational')
                  ? 'text-[#10B981]'
                  : 'text-[#38BDF8]'
              }`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
