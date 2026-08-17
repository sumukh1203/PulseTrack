import React from 'react';

function formatTimeAgo(occurredAt) {
  if (!occurredAt) return '—';
  const occurred = new Date(occurredAt);
  const now = new Date();
  const diffMs = now - occurred;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 10) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function RecentActivity({ recentEvents = [], onSelectEvent }) {
  const eventsToShow = recentEvents.slice(0, 6);

  return (
    <div className="py-4 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[#f4f4f5] tracking-tight">Recent activity</h3>
      </div>

      <div className="w-full">
        {eventsToShow.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#71717a] border-t border-[#27272a]">
            No recent events.
          </div>
        ) : (
          <div className="divide-y divide-[#18181b] border-t border-[#27272a]">
            {eventsToShow.map((evt, idx) => (
              <div
                key={evt.id || idx}
                onClick={() => onSelectEvent && onSelectEvent(evt.event_name)}
                className="py-3 flex items-center justify-between text-xs hover:bg-[#18181b]/50 cursor-pointer transition-colors group px-1"
              >
                <div className="flex items-center gap-3 truncate">
                  <span className="font-semibold text-[#f4f4f5] group-hover:text-[#3b82f6] transition-colors">
                    {evt.event_name}
                  </span>
                  <span className="text-[11px] font-mono text-[#71717a] truncate max-w-[120px] sm:max-w-none">
                    {evt.distinct_id || 'anonymous'}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#71717a] shrink-0">
                  {formatTimeAgo(evt.occurred_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
