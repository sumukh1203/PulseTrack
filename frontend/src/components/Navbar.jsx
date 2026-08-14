import React from 'react';
import { Activity, Server, Search, Terminal, Zap, ShieldCheck } from 'lucide-react';

export default function Navbar({ 
  applications = [], 
  selectedApp, 
  onSelectApp, 
  health, 
  onOpenCommandPalette,
  onOpenSimulator 
}) {
  const isHealthy = health?.status === 'healthy';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[#1E293B] px-4 py-3 flex items-center justify-between">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-linear-to-br from-indigo-500 to-cyan-400 flex items-center justify-center glow-primary">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-white">PulseTrack</span>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-mono font-semibold border border-indigo-500/30">
              v1.0.0
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] hidden sm:block">Telemetry & Event-Collection Engine</p>
        </div>
      </div>

      {/* Center Controls: Tenant Selector & Global Search */}
      <div className="flex items-center gap-3">
        {/* App Selector Dropdown */}
        <div className="relative">
          <select
            value={selectedApp?.id || ''}
            onChange={(e) => {
              const app = applications.find(a => a.id === e.target.value);
              onSelectApp(app || null);
            }}
            className="bg-[#1A202C] text-sm text-[#F8FAFC] border border-[#334155] rounded-md px-3 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium pr-8"
          >
            <option value="">All Applications ({applications.length})</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name} ({app.api_key_prefix})
              </option>
            ))}
          </select>
        </div>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-2 bg-[#1A202C] hover:bg-[#242C3D] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#334155] px-3 py-1.5 rounded-md text-xs transition-all"
        >
          <Search className="w-3.5 h-3.5 text-[#64748B]" />
          <span>Quick Find...</span>
          <kbd className="bg-[#0B0E14] text-[10px] font-mono px-1.5 py-0.5 rounded border border-[#334155] text-[#94A3B8]">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions: Event Simulator & System Health Status */}
      <div className="flex items-center gap-3">
        {/* Live Event Simulator Trigger */}
        <button
          onClick={onOpenSimulator}
          className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
          title="Send sample telemetry event to backend"
        >
          <Zap className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Event Tester</span>
        </button>

        {/* Health Status Pill */}
        <div className="flex items-center gap-2 bg-[#111620] border border-[#1E293B] px-3 py-1.5 rounded-full text-xs">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-[#10B981] animate-status-pulse glow-success' : 'bg-[#EF4444]'}`} />
          <span className="font-medium text-[#F8FAFC] hidden sm:inline">
            {isHealthy ? 'Operational' : 'Degraded'}
          </span>
        </div>
      </div>
    </header>
  );
}
