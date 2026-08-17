import React, { useState } from 'react';
import { Search, ArrowUpDown, Eye } from 'lucide-react';
import EventInspectorDrawer from '../components/EventInspectorDrawer';

export default function EventsView({ recentEvents = [], selectedApp, onSelectEventName }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [selectedEventType, setSelectedEventType] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'name'

  // Extract distinct event types present in recentEvents
  const distinctEventNames = Array.from(new Set(recentEvents.map((e) => e.event_name))).filter(Boolean);

  const filteredEvents = recentEvents
    .filter((evt) => {
      const matchType = selectedEventType === 'all' || evt.event_name === selectedEventType;
      const q = filterText.toLowerCase();
      const matchQuery =
        !filterText ||
        (evt.event_name && evt.event_name.toLowerCase().includes(q)) ||
        (evt.distinct_id && evt.distinct_id.toLowerCase().includes(q)) ||
        (evt.session_id && evt.session_id.toLowerCase().includes(q)) ||
        (evt.id && String(evt.id).includes(q));

      return matchType && matchQuery;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return (a.event_name || '').localeCompare(b.event_name || '');
      }
      return new Date(b.occurred_at || 0) - new Date(a.occurred_at || 0);
    });

  const handleInspect = (evt) => {
    setSelectedEvent(evt);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header & Filter Controls Bar */}
      <div className="border-b border-[#27272a] pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#f4f4f5]">Events</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Real-time inspection of telemetry events captured for <span className="font-semibold text-[#f4f4f5]">{selectedApp?.name}</span>
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          {/* Event Type Filter */}
          <div className="relative">
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="bg-[#18181b] text-xs text-[#f4f4f5] border border-[#27272a] hover:border-[#52525b] rounded-md px-2.5 py-1.5 focus:outline-none cursor-pointer font-medium"
            >
              <option value="all">All event types ({distinctEventNames.length})</option>
              {distinctEventNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search distinct_id, event..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-[#18181b] text-xs text-[#f4f4f5] pl-8 pr-3 py-1.5 rounded-md border border-[#27272a] focus:outline-none focus:border-[#52525b] placeholder-[#71717a]"
            />
          </div>

          {/* Sort Switcher */}
          <button
            onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
            className="bg-[#18181b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowUpDown className="w-3 h-3 text-[#71717a]" />
            <span>{sortBy === 'recent' ? 'Recent' : 'Name'}</span>
          </button>
        </div>
      </div>

      {/* Events Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] text-[#71717a] font-normal">
              <th className="py-2.5 font-normal">Event ID</th>
              <th className="py-2.5 font-normal">Event Name</th>
              <th className="py-2.5 font-normal">Distinct ID</th>
              <th className="py-2.5 font-normal">Session ID</th>
              <th className="py-2.5 font-normal">Occurred At</th>
              <th className="py-2.5 font-normal">Metadata Preview</th>
              <th className="py-2.5 font-normal text-right pr-2">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181b]">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#71717a]">
                  No matching events found.
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt, idx) => (
                <tr key={evt.id || idx} className="hover:bg-[#18181b]/30 transition-colors">
                  <td className="py-3.5 font-mono text-[#71717a]">#{evt.id || idx + 1}</td>
                  <td className="py-3.5 font-semibold text-[#f4f4f5]">
                    <button
                      onClick={() => onSelectEventName && onSelectEventName(evt.event_name)}
                      className="bg-[#3b82f6]/10 text-[#3b82f6] hover:bg-[#3b82f6]/20 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer border-none"
                    >
                      {evt.event_name}
                    </button>
                  </td>
                  <td className="py-3.5 font-mono text-[#a1a1aa]">{evt.distinct_id || '—'}</td>
                  <td className="py-3.5 font-mono text-[#71717a]">{evt.session_id || '—'}</td>
                  <td className="py-3.5 text-[#a1a1aa]">
                    {evt.occurred_at ? new Date(evt.occurred_at).toLocaleString() : '—'}
                  </td>
                  <td className="py-3.5 font-mono text-[#71717a] max-w-xs truncate">
                    {JSON.stringify(evt.metadata || evt.event_metadata || {})}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <button
                      onClick={() => handleInspect(evt)}
                      className="text-[#3b82f6] hover:text-[#2563eb] font-semibold transition-colors cursor-pointer text-xs"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-over Event Drawer */}
      <EventInspectorDrawer
        isOpen={drawerOpen}
        event={selectedEvent}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
