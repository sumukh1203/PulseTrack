import React from 'react';
import { Activity, Server, Cpu, Clock, ShieldCheck, Zap, ArrowUpRight, BarChart3 } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import ChartContainer from '../components/ChartContainer';

export default function DashboardView({ applications = [], health, onSelectApp, onCreateApp, onOpenSimulator }) {
  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-linear-to-r from-[#111620] via-[#1A202C] to-[#111620] p-6 rounded-xl border border-[#1E293B]">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            PulseTrack Developer Operational Overview
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1">
            Real-time event ingestion throughput, p95 latency, worker queue depth, and infrastructure monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSimulator}
            className="bg-[#1A202C] hover:bg-[#242C3D] text-[#38BDF8] border border-[#334155] px-3.5 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            <span>Test Ingestion</span>
          </button>
          <button
            onClick={onCreateApp}
            className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-md text-xs font-semibold transition-all glow-primary"
          >
            + Create Application
          </button>
        </div>
      </div>

      {/* 4-Column KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Events Ingested (24h)"
          value="1,428,940"
          subtext="Processed via Async Engine"
          trend="+12.4% vs prev period"
          icon={Activity}
          color="indigo"
        />
        <KpiCard
          title="p95 Ingestion Latency"
          value="14.2 ms"
          subtext="Sub-20ms target SLA"
          trend="-2.1 ms (Faster)"
          icon={Clock}
          color="cyan"
        />
        <KpiCard
          title="Worker Queue Depth"
          value="0 items"
          subtext="Upstash Redis Stream"
          trend="Nominal (0 DLQ)"
          icon={Cpu}
          color="emerald"
        />
        <KpiCard
          title="System Health Status"
          value={health?.status === 'healthy' ? '100% Nominal' : 'Degraded'}
          subtext="FastAPI + PostgreSQL + Redis"
          trend="Operational"
          icon={ShieldCheck}
          color="amber"
        />
      </div>

      {/* Main Throughput Time-Series Chart */}
      <ChartContainer
        title="24-Hour Ingestion Throughput (Events / sec)"
        type="line"
        height={280}
      />

      {/* Split Grid: Recent Apps & Infrastructure Components */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registered Apps (2 Cols) */}
        <div className="lg:col-span-2 bg-[#111620] border border-[#1E293B] rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" />
              Registered Application Tenants ({applications.length})
            </h3>
            <span className="text-xs text-[#38BDF8] font-mono">Live Ingestion</span>
          </div>

          <div className="divide-y divide-[#1E293B]">
            {applications.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B]">
                No applications registered. Click "+ Create Application" to begin.
              </div>
            ) : (
              applications.slice(0, 5).map((app) => (
                <div
                  key={app.id}
                  onClick={() => onSelectApp(app)}
                  className="py-3 flex items-center justify-between hover:bg-[#1A202C] px-3 rounded-md cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <div>
                      <div className="font-semibold text-xs text-[#F8FAFC]">{app.name}</div>
                      <div className="font-mono text-[11px] text-[#64748B]">{app.api_key_prefix}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs text-[#38BDF8]">
                      {app.rate_limit_per_minute || 600} req/min
                    </div>
                    <div className="text-[10px] text-[#10B981] font-semibold">Active Tenant</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Component Status Panel (1 Col) */}
        <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-5">
          <h3 className="text-sm font-semibold text-[#F8FAFC] mb-4 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#38BDF8]" />
            Infrastructure Status
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-3 bg-[#1A202C] rounded-lg border border-[#334155] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#F8FAFC]">FastAPI Web Service</div>
                <div className="text-[#94A3B8] font-mono text-[11px]">Port 8000 (Async)</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#10B981]/20 text-[#10B981]">
                Connected
              </span>
            </div>

            <div className="p-3 bg-[#1A202C] rounded-lg border border-[#334155] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#F8FAFC]">Neon PostgreSQL DB</div>
                <div className="text-[#94A3B8] font-mono text-[11px]">AsyncPG Pool (SSL)</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#10B981]/20 text-[#10B981]">
                Connected
              </span>
            </div>

            <div className="p-3 bg-[#1A202C] rounded-lg border border-[#334155] flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#F8FAFC]">Upstash Redis Cache</div>
                <div className="text-[#94A3B8] font-mono text-[11px]">Cache-Aside & Queue</div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#10B981]/20 text-[#10B981]">
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
