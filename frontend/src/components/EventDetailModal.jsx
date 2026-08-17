import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { fetchMetrics } from '../services/api';

export default function EventDetailModal({ isOpen, eventName, selectedApp, onClose }) {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    if (isOpen && eventName && selectedApp?.id) {
      setLoading(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 7);

      fetchMetrics(selectedApp.id, {
        event_name: eventName,
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        granularity: 'day',
      })
        .then((res) => {
          setMetrics(res?.data || []);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, eventName, selectedApp?.id]);

  if (!isOpen || !eventName) return null;

  const totalEventCount = metrics.reduce((sum, item) => sum + (item.count || 0), 0);
  const eventsPerDay = Math.round(totalEventCount / 7);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 font-sans">
      <div className="bg-[#18181b] border border-[#27272a] w-full max-w-2xl rounded-lg p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header Row */}
        <div className="flex items-start justify-between border-b border-[#27272a] pb-4">
          <div>
            <span className="text-[11px] text-[#71717a] font-medium uppercase tracking-wider">Event Details</span>
            <h2 className="text-xl font-bold text-[#f4f4f5] mt-1">{eventName}</h2>
            <p className="text-xs text-[#a1a1aa] mt-1">
              Captured telemetry for application <span className="font-semibold text-[#f4f4f5]">{selectedApp?.name}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-[#71717a] hover:text-[#f4f4f5] p-1.5 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Focused Metric Cards */}
        <div className="grid grid-cols-3 gap-6 py-2 border-b border-[#27272a]">
          <div className="flex flex-col text-xs">
            <span className="text-[#71717a] font-medium">Total Events (7d)</span>
            <span className="text-xl font-bold text-[#f4f4f5] mt-1 font-mono">
              {new Intl.NumberFormat('en-US').format(totalEventCount)}
            </span>
          </div>

          <div className="flex flex-col text-xs">
            <span className="text-[#71717a] font-medium">Events / Day</span>
            <span className="text-xl font-bold text-[#f4f4f5] mt-1 font-mono">
              {new Intl.NumberFormat('en-US').format(eventsPerDay)}
            </span>
          </div>

          <div className="flex flex-col text-xs">
            <span className="text-[#71717a] font-medium">Status</span>
            <span className="text-[#10b981] font-semibold mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              <span>Active</span>
            </span>
          </div>
        </div>

        {/* Focused Time-Series Chart */}
        <ChartContainer
          title="7-day activity trend"
          type="line"
          metrics={metrics}
          granularity="day"
          comparePeriod={false}
          height={200}
        />

        {/* Metadata Note */}
        <div className="p-3 bg-[#09090b] border border-[#27272a] rounded text-xs space-y-1 text-[#a1a1aa] leading-relaxed">
          <div className="font-medium text-[#f4f4f5]">Metadata schema</div>
          <p>
            Custom key-values associated with <code className="text-[#3b82f6]">{eventName}</code> are stored index-optimised in Neon PostgreSQL. To inspect raw parameters, navigate to the <strong className="text-[#f4f4f5]">Events</strong> tab.
          </p>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end pt-3 border-t border-[#27272a]">
          <button
            onClick={onClose}
            className="bg-[#09090b] hover:bg-[#18181b] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
