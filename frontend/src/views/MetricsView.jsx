import React, { useState } from 'react';
import ChartContainer from '../components/ChartContainer';
import { BarChart3, Zap } from 'lucide-react';

export default function MetricsView({ selectedApp, analytics }) {
  const { currentMetrics, previousMetrics, granularity, setGranularity, selectedEventFilter, setSelectedEventFilter, comparePeriod } = analytics;

  // Extract list of distinct event names present in metrics
  const distinctEvents = Array.from(new Set(currentMetrics.map((m) => m.event_name))).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Controls Bar */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#38BDF8]" />
            Analytics & Metrics Rollup
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Aggregated telemetry event counts grouped by date range, event signature, and bucket granularity
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Event Selector */}
          <select
            value={selectedEventFilter}
            onChange={(e) => setSelectedEventFilter(e.target.value)}
            className="bg-[#1A202C] text-xs text-[#F8FAFC] border border-[#334155] rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">All Events (Total Volume)</option>
            {distinctEvents.map((evtName) => (
              <option key={evtName} value={evtName}>
                {evtName}
              </option>
            ))}
          </select>

          {/* Granularity Switcher */}
          <div className="flex bg-[#1A202C] border border-[#334155] rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setGranularity('day')}
              className={`px-3 py-1 rounded-md transition-all ${
                granularity === 'day' ? 'bg-[#6366F1] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setGranularity('hour')}
              className={`px-3 py-1 rounded-md transition-all ${
                granularity === 'hour' ? 'bg-[#6366F1] text-white font-bold' : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Hour
            </button>
          </div>

          {/* Cache Status Badge */}
          <div className="flex items-center gap-1.5 bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Redis Rollup Cache Active</span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <ChartContainer
        title={`Event Rollup (${selectedEventFilter === 'all' ? 'All Events' : selectedEventFilter})`}
        subtitle={`Granularity: ${granularity.toUpperCase()}`}
        type="bar"
        metrics={currentMetrics}
        previousMetrics={previousMetrics}
        granularity={granularity}
        comparePeriod={comparePeriod}
        height={320}
      />

      {/* Date Bucket Breakdown Table */}
      <div className="bg-[#111620] border border-[#1E293B] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Date Bucket Rollup Table</h3>
          <span className="text-xs text-[#38BDF8] font-mono">{currentMetrics.length} Buckets Rendered</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1A202C] text-[#94A3B8] font-mono border-b border-[#1E293B]">
              <tr>
                <th className="py-3 px-4">Bucket Timestamp</th>
                <th className="py-3 px-4">Event Signature</th>
                <th className="py-3 px-4">Aggregated Count</th>
                <th className="py-3 px-4">Storage Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E293B] font-mono text-[#F8FAFC]">
              {currentMetrics.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-xs text-[#64748B]">
                    No bucketed metrics found for the selected filter parameters.
                  </td>
                </tr>
              ) : (
                currentMetrics.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#1A202C]/60 transition-colors">
                    <td className="py-3 px-4 text-[#38BDF8]">
                      {item.bucket ? new Date(item.bucket).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {item.event_name || selectedEventFilter}
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {new Intl.NumberFormat('en-US').format(item.count || 0)}
                    </td>
                    <td className="py-3 px-4 text-[#10B981]">Neon Postgres Rollup</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
