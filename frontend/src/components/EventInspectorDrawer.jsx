import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Clock, Hash, Tag, Layers } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#111620] border-l border-[#1E293B] h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between bg-[#1A202C]">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#38BDF8]" />
            <h3 className="text-sm font-bold text-[#F8FAFC]">
              Event Detail Inspector <span className="font-mono text-[#38BDF8]">#{event.id || '10432'}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC] p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Main Event Badges */}
          <div className="bg-[#1A202C] p-4 rounded-lg border border-[#334155] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8] font-semibold">Event Name</span>
              <span className="bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2.5 py-0.5 rounded font-mono font-bold">
                {event.event_name || 'button_click'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Application ID</span>
              <span className="font-mono text-[#38BDF8]">
                {(event.application_id || '6a1e5c2e-2f3b-4b8a').slice(0, 16)}...
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#94A3B8]">Status</span>
              <span className="text-[#10B981] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                Stored (PostgreSQL Partition)
              </span>
            </div>
          </div>

          {/* User & Session Context */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Identity & Session Context
            </span>
            <div className="bg-[#0B0E14] p-3 rounded border border-[#1E293B] space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Distinct ID:</span>
                <span className="text-[#F8FAFC]">{event.distinct_id || 'user_42'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Session ID:</span>
                <span className="text-[#F8FAFC]">{event.session_id || 'sess_9f8a2b3c'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Idempotency Key:</span>
                <span className="text-[#38BDF8]">{event.idempotency_key || '550e8400-e29b'}</span>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B] block">
              Timestamps & Latency
            </span>
            <div className="bg-[#0B0E14] p-3 rounded border border-[#1E293B] space-y-2 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Occurred At:</span>
                <span className="text-[#F8FAFC]">{event.occurred_at || new Date().toISOString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Ingested At:</span>
                <span className="text-[#F8FAFC]">{event.created_at || new Date().toISOString()}</span>
              </div>
            </div>
          </div>

          {/* Raw JSON Payload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                Raw JSON Metadata (JSONB)
              </span>
              <button
                onClick={handleCopyJson}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            </div>
            <pre className="bg-[#0B0E14] p-3.5 rounded border border-[#334155] font-mono text-[11px] text-[#38BDF8] overflow-x-auto">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#1E293B] bg-[#1A202C]">
          <button
            onClick={onClose}
            className="w-full bg-[#111620] hover:bg-[#242C3D] text-[#94A3B8] border border-[#334155] py-2 rounded text-xs font-semibold"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
