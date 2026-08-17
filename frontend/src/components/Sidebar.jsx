import React from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Server, 
  Code2, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange, isCollapsed, onToggleCollapse }) {
  const primaryNavItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: Activity },
    { id: 'applications', label: 'Applications', icon: Server },
  ];

  const secondaryNavItems = [
    { id: 'api', label: 'API', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderItem = (item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[13px] transition-all font-medium ${
          isActive
            ? 'bg-[#18181b] text-[#f4f4f5] font-semibold'
            : 'text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b]/50'
        }`}
      >
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#3b82f6]' : 'text-[#71717a]'}`} />
        {!isCollapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside
      className={`hidden md:flex flex-col justify-between bg-[#09090b] border-r border-[#27272a] h-[calc(100vh-61px)] sticky top-[61px] shrink-0 transition-all duration-200 z-30 ${
        isCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Navigation Brand & Links */}
      <div className="p-3 space-y-6">
        {!isCollapsed && (
          <div className="px-3 py-1 text-sm font-semibold tracking-tight text-[#f4f4f5] font-sans">
            PulseTrack
          </div>
        )}

        <div className="space-y-1">
          {primaryNavItems.map(renderItem)}
        </div>

        <div className="border-t border-[#27272a] my-2" />

        <div className="space-y-1">
          {secondaryNavItems.map(renderItem)}
        </div>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[#27272a] bg-[#09090b]">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded-md bg-[#09090b] hover:bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] transition-colors"
          title={isCollapsed ? 'Expand' : 'Collapse'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  );
}
