import React from 'react';

export default function EventBreakdownTable({ breakdownList = [], onSelectEvent }) {
  return (
    <div className="py-4 font-sans">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-[#f4f4f5] tracking-tight">Top events</h3>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] text-[#71717a] font-normal">
              <th className="py-2 font-normal">Event</th>
              <th className="py-2 text-right font-normal">Events</th>
              <th className="py-2 text-right font-normal pr-2">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181b]">
            {breakdownList.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-6 text-center text-xs text-[#71717a]">
                  No event data captured.
                </td>
              </tr>
            ) : (
              breakdownList.slice(0, 6).map((item) => {
                const isPositive = item.delta >= 0;
                return (
                  <tr
                    key={item.event_name}
                    onClick={() => onSelectEvent && onSelectEvent(item.event_name)}
                    className="hover:bg-[#18181b]/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 text-[#f4f4f5] font-medium group-hover:text-[#3b82f6] transition-colors truncate max-w-[200px]">
                      {item.event_name}
                    </td>
                    <td className="py-3 text-right font-mono text-[#f4f4f5]">
                      {new Intl.NumberFormat('en-US').format(item.events)}
                    </td>
                    <td className={`py-3 text-right font-mono pr-2 ${isPositive ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      {item.delta !== null ? (
                        <>
                          {isPositive ? '+' : ''}
                          {item.delta}%
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
