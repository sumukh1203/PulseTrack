import React, { useState } from 'react';
import ChartContainer from '../components/ChartContainer';
import { BarChart3, Filter, Zap, Database } from 'lucide-react';

export default function MetricsView({ applications = [], selectedApp }) {
  const [eventName, setEventName] = useState('all');
  const [granularity, setGranularity] = useState('day');
  const [cacheHit, setCacheHit] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls Bar */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#38BDF8]" />
            Metrics Time-Series Rollup
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Aggregated telemetry event counts grouped by event name, date range, and bucket granularity
          </p>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3">
          <select
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="bg-[#1A202C] text-xs text-[#F8FAFC] border border-[#334155] rounded px-3 py-1.5 focus:outline-none"
          >
            <option value="all">All Events (Total Volume)</option>
            <option value="button_click">button_click</option>
            <option value="page_view">page_view</option>
            <option value="user_signup">user_signup</option>
          </select>

          <div className="flex bg-[#1A202C] border border-[#334155] rounded p-0.5 text-xs font-mono">
            <button
              onClick={() => setGranularity('day')}
              className={`px-3 py-1 rounded ${granularity === 'day' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8]'}`}
            >
              Day
            </button>
            <button
              onClick={() => setGranularity('hour')}
              className={`px-3 py-1 rounded ${granularity === 'hour' ? 'bg-[#6366F1] text-white font-semibold' : 'text-[#94A3B8]'}`}
            >
              Hour
            </button>
          </div>

          {/* Redis Cache Status Pill */}
          <div className="flex items-center gap-1.5 bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/30 px-2.5 py-1 rounded text-xs font-mono font-semibold">
            <Zap className="w-3.5 h-3.5" />
            <span>Cache HIT (Upstash Redis)</span>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <ChartContainer
        title={`Aggregated Event Volume (${eventName}) — Granularity: ${granularity.toUpperCase()}`}
        type="bar"
        height={300}
      />

      {/* Date Bucket Breakdown Table */}
      <div className="bg-[#111620] border border-[#1E293B] rounded-lg overflow-hidden">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">Date Bucket Rollup Table</h3>
          <span className="text-xs text-[#94A3B8] font-mono">3 Buckets Rendered</span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#1A202C] text-[#94A3B8] font-mono border-b border-[#1E293B]">
            <tr>
              <th className="py-3 px-4">Bucket Period</th>
              <th className="py-3 px-4">Event Name</th>
              <th className="py-3 px-4">Ingested Count</th>
              <th className="py-3 px-4">Cache Resolution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] font-mono text-[#F8FAFC]">
            <tr className="hover:bg-[#1A202C]/60">
              <td className="py-3 px-4 text-[#38BDF8]">2026-08-08 00:00:00</td>
              <td className="py-3 px-4">button_click</td>
              <td className="py-3 px-4 font-bold text-white">428,910</td>
              <td className="py-3 px-4 text-[#10B981]">Cached (Redis Rollup)</td>
            </tr>
            <tr className="hover:bg-[#1A202C]/60">
              <td className="py-3 px-4 text-[#38BDF8]">2026-08-09 00:00:00</td>
              <td className="py-3 px-4">button_click</td>
              <td className="py-3 px-4 font-bold text-white">512,040</td>
              <td className="py-3 px-4 text-[#10B981]">Cached (Redis Rollup)</td>
            </tr>
            <tr className="hover:bg-[#1A202C]/60">
              <td className="py-3 px-4 text-[#38BDF8]">2026-08-10 00:00:00</td>
              <td className="py-3 px-4">button_click</td>
              <td className="py-3 px-4 font-bold text-white">487,990</td>
              <td className="py-3 px-4 text-[#38BDF8]">Live DB Query (AsyncPG)</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
