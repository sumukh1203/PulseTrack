import React, { useState, useEffect } from 'react';
import { Search, LayoutDashboard, Server, BarChart3, Activity, Terminal, Cpu, Key, Settings, X } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose, onSelectTab, onCreateApp }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        isOpen ? onClose() : null;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands = [
    { id: 'dashboard', label: 'Go to Dashboard', category: 'Navigation', icon: LayoutDashboard, action: () => onSelectTab('dashboard') },
    { id: 'applications', label: 'Go to Applications Manager', category: 'Navigation', icon: Server, action: () => onSelectTab('applications') },
    { id: 'metrics', label: 'View Metrics Rollup', category: 'Analytics', icon: BarChart3, action: () => onSelectTab('metrics') },
    { id: 'events', label: 'Open Live Events Stream', category: 'Telemetry', icon: Activity, action: () => onSelectTab('events') },
    { id: 'logs', label: 'Open Structured Request Logs', category: 'Observability', icon: Terminal, action: () => onSelectTab('logs') },
    { id: 'monitoring', label: 'View Infrastructure Health', category: 'System', icon: Cpu, action: () => onSelectTab('monitoring') },
    { id: 'apikeys', label: 'API Keys & Security', category: 'Security', icon: Key, action: () => onSelectTab('apikeys') },
    { id: 'create', label: '+ Create New Application & API Key', category: 'Actions', icon: Server, action: onCreateApp },
  ];

  const filtered = commands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) || 
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl glass-modal rounded-xl overflow-hidden border border-[#334155] shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="p-4 border-b border-[#1E293B] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#6366F1]" />
          <input
            type="text"
            autoFocus
            placeholder="Type a command or search workspace..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#F8FAFC] focus:outline-none placeholder-[#64748B]"
          />
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Command Items List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#64748B]">No matching commands found</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-xs hover:bg-[#6366F1]/15 hover:text-[#F8FAFC] text-[#94A3B8] transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#64748B] group-hover:text-[#6366F1]" />
                    <span className="font-medium text-[#F8FAFC]">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#0B0E14] text-[#64748B] px-2 py-0.5 rounded border border-[#334155]">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-[#1E293B] bg-[#0B0E14]/40 flex items-center justify-between text-[11px] text-[#64748B]">
          <span>Navigation: <kbd className="text-[#94A3B8]">⌘K</kbd> to toggle</span>
          <span>PulseTrack Command Engine</span>
        </div>
      </div>
    </div>
  );
}
