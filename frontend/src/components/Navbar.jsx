import React from 'react';
import DateRangePicker from './DateRangePicker';

export default function Navbar({
  applications = [],
  selectedApp,
  onSelectApp,
  dateRange,
  onRangeChange,
  comparePeriod,
  onCompareToggle,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#09090b] border-b border-[#27272a] px-4 md:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap">
      {/* Left: App Context Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-[#71717a] font-sans">Application</span>
        <div className="relative">
          <select
            value={selectedApp?.id || ''}
            onChange={(e) => {
              const app = applications.find((a) => a.id === e.target.value);
              onSelectApp(app || null);
            }}
            className="bg-[#09090b] text-xs text-[#f4f4f5] border border-[#27272a] hover:border-[#52525b] rounded-md px-2.5 py-1.5 focus:outline-none transition-all font-semibold cursor-pointer max-w-[200px] truncate"
          >
            {applications.length === 0 ? (
              <option value="">No apps registered</option>
            ) : (
              applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Right: Date range picker & Compare */}
      <div className="flex items-center gap-2">
        <DateRangePicker
          dateRange={dateRange}
          onRangeChange={onRangeChange}
          comparePeriod={comparePeriod}
          onCompareToggle={onCompareToggle}
          customStart={customStart}
          onCustomStartChange={onCustomStartChange}
          customEnd={customEnd}
          onCustomEndChange={onCustomEndChange}
        />
      </div>
    </header>
  );
}
