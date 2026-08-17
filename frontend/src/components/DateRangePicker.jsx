import React, { useState } from 'react';
import { Calendar, ChevronDown, Check, ArrowRightLeft } from 'lucide-react';

export default function DateRangePicker({
  dateRange,
  onRangeChange,
  comparePeriod,
  onCompareToggle,
  customStart,
  onCustomStartChange,
  customEnd,
  onCustomEndChange,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'custom', label: 'Custom range...' },
  ];

  const currentLabel = presets.find((p) => p.key === dateRange)?.label || 'Last 7 days';

  const handleSelectPreset = (key) => {
    onRangeChange(key);
    if (key !== 'custom') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-flex items-center gap-2 flex-wrap font-sans">
      {/* Primary Trigger Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all cursor-pointer"
        >
          <Calendar className="w-3.5 h-3.5 text-[#71717a]" />
          <span>{currentLabel}</span>
          <ChevronDown className="w-3 h-3 text-[#71717a]" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-1.5 w-60 bg-[#18181b] rounded-lg p-1.5 z-50 shadow-lg border border-[#27272a]">
            <div className="space-y-0.5">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handleSelectPreset(preset.key)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    dateRange === preset.key
                      ? 'bg-[#3b82f6]/10 text-[#3b82f6] font-semibold'
                      : 'text-[#a1a1aa] hover:bg-[#27272a] hover:text-[#f4f4f5]'
                  }`}
                >
                  <span>{preset.label}</span>
                  {dateRange === preset.key && <Check className="w-3.5 h-3.5 text-[#3b82f6]" />}
                </button>
              ))}
            </div>

            {/* Custom Range Input Panel */}
            {dateRange === 'custom' && (
              <div className="mt-2 pt-2 border-t border-[#27272a] space-y-2 px-1">
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => onCustomStartChange(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#a1a1aa] mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => onCustomEndChange(e.target.value)}
                    className="w-full bg-[#09090b] border border-[#27272a] rounded px-2 py-1 text-xs text-[#f4f4f5] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white py-1 rounded text-xs font-semibold cursor-pointer"
                >
                  Apply Custom Range
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compare Toggle Button */}
      <button
        onClick={() => onCompareToggle(!comparePeriod)}
        className={`px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
          comparePeriod
            ? 'bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30'
            : 'bg-[#18181b] text-[#71717a] border-[#27272a] hover:text-[#a1a1aa]'
        }`}
        title="Compare data against previous period"
      >
        <ArrowRightLeft className="w-3 h-3" />
        <span>Compare</span>
      </button>
    </div>
  );
}
