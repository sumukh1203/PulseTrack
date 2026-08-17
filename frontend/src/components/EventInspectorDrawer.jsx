import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

export default function EventInspectorDrawer({ isOpen, event, onClose }) {
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen || !event) return null;

  const jsonString = JSON.stringify(event.metadata || event.raw_payload || {}, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonString);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end font-sans">
      <div className="w-full max-w-md bg-[#09090b] border-l border-[#27272a] h-full flex flex-col justify-between shadow-xl animate-in slide-in-from-right duration-150">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#f4f4f5]">
            Event details <span className="font-mono text-[#71717a]">#{event.id}</span>
          </h3>
          <button onClick={onClose} className="text-[#71717a] hover:text-[#f4f4f5] p-1 rounded transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5 border-b border-[#18181b]">
              <span className="text-[#71717a]">Event name</span>
              <span className="font-mono font-semibold text-[#f4f4f5]">{event.event_name}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#18181b]">
              <span className="text-[#71717a]">Distinct ID</span>
              <span className="font-mono text-[#f4f4f5]">{event.distinct_id || 'anonymous'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-[#18181b]">
              <span className="text-[#71717a]">Session ID</span>
              <span className="font-mono text-[#f4f4f5]">{event.session_id || '—'}</span>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider block">Timestamps</span>
            <div className="bg-[#18181b] p-3 rounded-md border border-[#27272a] space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#71717a]">Occurred</span>
                <span className="text-[#f4f4f5]">{event.occurred_at}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717a]">Ingested</span>
                <span className="text-[#f4f4f5]">{event.created_at || '—'}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#71717a] uppercase tracking-wider">Metadata</span>
              <button
                onClick={handleCopyJson}
                className="text-xs text-[#3b82f6] hover:text-[#2563eb] flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied' : 'Copy payload'}</span>
              </button>
            </div>
            <pre className="bg-[#18181b] p-3 rounded-md border border-[#27272a] font-mono text-[11px] text-[#a1a1aa] overflow-x-auto">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#18181b]">
          <button
            onClick={onClose}
            className="w-full bg-[#09090b] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#f4f4f5] border border-[#27272a] py-2 rounded-md text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
