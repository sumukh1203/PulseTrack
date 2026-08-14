import React, { useState } from 'react';
import { Activity, Eye, Search, Filter } from 'lucide-react';
import EventInspectorDrawer from '../components/EventInspectorDrawer';

export default function EventsView() {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filterText, setFilterText] = useState('');

  const sampleEvents = [
    { id: 10432, event_name: 'button_click', distinct_id: 'user_42', session_id: 'sess_9f8a2b3c', idempotency_key: '550e8400-e29b', occurred_at: '2026-08-10T12:00:00Z', metadata: { button_id: 'cta-hero', page: '/pricing', variant: 'B' } },
    { id: 10433, event_name: 'page_view', distinct_id: 'user_99', session_id: 'sess_1a2b3c4d', idempotency_key: '661f9501-f30c', occurred_at: '2026-08-10T12:01:15Z', metadata: { url: '/dashboard', referrer: 'google.com' } },
    { id: 10434, event_name: 'user_signup', distinct_id: 'user_102', session_id: 'sess_8e7d6c5b', idempotency_key: '772g0602-g41d', occurred_at: '2026-08-10T12:02:42Z', metadata: { plan: 'pro', billing: 'annual' } },
    { id: 10435, event_name: 'button_click', distinct_id: 'user_88', session_id: 'sess_4b3c2a1d', idempotency_key: '883h1703-h52e', occurred_at: '2026-08-10T12:03:10Z', metadata: { button_id: 'checkout', amount: 99.0 } },
  ];

  const handleInspect = (evt) => {
    setSelectedEvent(evt);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Bar */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400" />
            Live Ingested Telemetry Events Stream
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Real-time inspection of single & batch ingested events stored in Neon PostgreSQL
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search event, session or user ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-[#1A202C] text-xs text-[#F8FAFC] pl-8 pr-3 py-1.5 rounded border border-[#334155] focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Events Stream Table */}
      <div className="bg-[#111620] border border-[#1E293B] rounded-lg overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1A202C] text-[#94A3B8] font-mono border-b border-[#1E293B]">
            <tr>
              <th className="py-3 px-4">Event ID</th>
              <th className="py-3 px-4">Event Name</th>
              <th className="py-3 px-4">Distinct ID</th>
              <th className="py-3 px-4">Session ID</th>
              <th className="py-3 px-4">Occurred At</th>
              <th className="py-3 px-4">JSON Preview</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] font-mono text-[#F8FAFC]">
            {sampleEvents.map((evt) => (
              <tr key={evt.id} className="hover:bg-[#1A202C]/60 transition-colors">
                <td className="py-3.5 px-4 text-[#38BDF8]">#{evt.id}</td>
                <td className="py-3.5 px-4">
                  <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded text-[11px] font-semibold">
                    {evt.event_name}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-[#94A3B8]">{evt.distinct_id}</td>
                <td className="py-3.5 px-4 text-[#64748B]">{evt.session_id}</td>
                <td className="py-3.5 px-4 text-[#94A3B8]">{evt.occurred_at}</td>
                <td className="py-3.5 px-4 text-[#38BDF8] max-w-xs truncate">
                  {JSON.stringify(evt.metadata)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleInspect(evt)}
                    className="bg-[#1A202C] hover:bg-[#242C3D] text-[#38BDF8] border border-[#334155] px-2.5 py-1 rounded text-xs inline-flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Slide-over Drawer Inspector */}
      <EventInspectorDrawer
        isOpen={drawerOpen}
        event={selectedEvent}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
}
