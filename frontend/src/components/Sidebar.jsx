import React from 'react';
import { 
  LayoutDashboard, 
  Server, 
  BarChart3, 
  Activity, 
  Terminal, 
  Cpu, 
  Key, 
  Settings, 
  HelpCircle 
} from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, appCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'g d' },
    { id: 'applications', label: 'Applications', icon: Server, badge: appCount, shortcut: 'g a' },
    { id: 'metrics', label: 'Metrics Rollup', icon: BarChart3, shortcut: 'g m' },
    { id: 'events', label: 'Events Stream', icon: Activity, badge: 'Live', shortcut: 'g e' },
    { id: 'logs', label: 'Request Logs', icon: Terminal, shortcut: 'g l' },
    { id: 'monitoring', label: 'Monitoring', icon: Cpu, shortcut: 'g h' },
    { id: 'apikeys', label: 'API Keys', icon: Key, shortcut: 'g k' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'g s' },
  ];

  return (
    <aside className="hidden md:flex flex-col justify-between w-64 bg-[#111620] border-r border-[#1E293B] h-[calc(100vh-61px)] sticky top-15.25 shrink-0">
      {/* Primary Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
          Workspace Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#6366F1]/15 text-[#F8FAFC] border border-[#6366F1]/30 font-semibold'
                  : 'text-[#94A3B8] hover:bg-[#1A202C] hover:text-[#F8FAFC]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#6366F1]' : 'text-[#64748B]'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#1A202C] text-[#94A3B8] border border-[#334155]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* System Footer Info */}
      <div className="p-4 border-t border-[#1E293B] bg-[#0B0E14]/40">
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span>FastAPI + AsyncPG</span>
          <span className="font-mono text-[#10B981]">Neon DB</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-[#94A3B8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Upstash Redis Active</span>
        </div>
      </div>
    </aside>
  );
}
