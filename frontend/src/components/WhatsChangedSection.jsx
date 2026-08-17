import React from 'react';
import { TrendingUp, TrendingDown, Clock, Zap, Sparkles } from 'lucide-react';

export default function WhatsChangedSection({ whatsChanged = {}, onSelectEvent }) {
  const { biggestIncrease, biggestDecrease, mostActiveEvent, peakActivity } = whatsChanged;

  return (
    <div className="bg-[#111620] border border-[#1E293B] rounded-xl p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            What's Changed?
          </h3>
          <span className="text-[11px] font-mono text-[#F59E0B] bg-[#F59E0B]/10 px-2 py-0.5 rounded border border-[#F59E0B]/30">
            Surfaced Insights
          </span>
        </div>

        <p className="text-xs text-[#94A3B8] mb-4">Key telemetry movements compared with previous period</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Biggest Increase */}
          <div
            onClick={() => biggestIncrease?.event_name && onSelectEvent && onSelectEvent(biggestIncrease.event_name)}
            className="p-3 bg-[#1A202C] border border-[#334155] rounded-lg hover:border-[#10B981]/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
              <span className="flex items-center gap-1 font-semibold text-[#10B981]">
                <TrendingUp className="w-3.5 h-3.5" />
                Biggest Increase
              </span>
              <span className="font-mono font-bold text-[#10B981]">
                {biggestIncrease ? `+${biggestIncrease.delta}%` : 'N/A'}
              </span>
            </div>
            <div className="font-bold text-sm text-[#F8FAFC] truncate">
              {biggestIncrease ? biggestIncrease.event_name : 'No growth detected'}
            </div>
          </div>

          {/* Biggest Decrease */}
          <div
            onClick={() => biggestDecrease?.event_name && onSelectEvent && onSelectEvent(biggestDecrease.event_name)}
            className="p-3 bg-[#1A202C] border border-[#334155] rounded-lg hover:border-[#EF4444]/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
              <span className="flex items-center gap-1 font-semibold text-[#EF4444]">
                <TrendingDown className="w-3.5 h-3.5" />
                Biggest Decrease
              </span>
              <span className="font-mono font-bold text-[#EF4444]">
                {biggestDecrease ? `${biggestDecrease.delta}%` : 'N/A'}
              </span>
            </div>
            <div className="font-bold text-sm text-[#F8FAFC] truncate">
              {biggestDecrease ? biggestDecrease.event_name : 'No drops detected'}
            </div>
          </div>

          {/* Peak Activity */}
          <div className="p-3 bg-[#1A202C] border border-[#334155] rounded-lg">
            <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
              <span className="flex items-center gap-1 font-semibold text-[#38BDF8]">
                <Clock className="w-3.5 h-3.5" />
                Peak Activity Window
              </span>
            </div>
            <div className="font-bold text-sm text-[#F8FAFC] truncate">
              {peakActivity || 'N/A'}
            </div>
          </div>

          {/* Most Active Event */}
          <div
            onClick={() => mostActiveEvent?.event_name && onSelectEvent && onSelectEvent(mostActiveEvent.event_name)}
            className="p-3 bg-[#1A202C] border border-[#334155] rounded-lg hover:border-[#6366F1]/50 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs text-[#94A3B8] mb-1">
              <span className="flex items-center gap-1 font-semibold text-[#6366F1]">
                <Zap className="w-3.5 h-3.5" />
                Most Active Event
              </span>
              <span className="font-mono font-bold text-[#38BDF8]">
                {mostActiveEvent ? `${mostActiveEvent.share}%` : '0%'}
              </span>
            </div>
            <div className="font-bold text-sm text-[#F8FAFC] truncate">
              {mostActiveEvent ? mostActiveEvent.event_name : 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
