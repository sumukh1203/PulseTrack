import React, { useState } from 'react';
import { X, Zap, Check, AlertCircle, Play } from 'lucide-react';
import { ingestEvent } from '../services/api';

export default function EventSimulatorModal({ isOpen, applications = [], onClose, onEventSent }) {
  const [selectedAppId, setSelectedAppId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [eventName, setEventName] = useState('button_click');
  const [distinctId, setDistinctId] = useState('user_42');
  const [sessionId, setSessionId] = useState('sess_9f8a2b3c');
  const [metadataJson, setMetadataJson] = useState('{\n  "button_id": "cta-hero",\n  "page": "/pricing",\n  "variant": "B"\n}');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSend = async (e) => {
    e.preventDefault();
    if (!apiKey) {
      setError('Please provide a valid Bearer API Key (e.g. pt_live_...) for the target application.');
      return;
    }

    let parsedMeta = {};
    try {
      parsedMeta = JSON.parse(metadataJson);
    } catch (err) {
      setError('Invalid JSON format in metadata field.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        event_name: eventName,
        distinct_id: distinctId,
        session_id: sessionId,
        metadata: parsedMeta,
        occurred_at: new Date().toISOString(),
      };

      const res = await ingestEvent(apiKey, payload);
      setResult(res);
      if (onEventSent) onEventSent(res);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Event ingestion failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg glass-modal rounded-xl overflow-hidden border border-[#334155] shadow-2xl">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400">
            <Zap className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#F8FAFC]">Live Ingestion Event Tester</h3>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSend} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] rounded-md flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>Event accepted & ingested successfully! Status: {result.status || 'Accepted'}</span>
            </div>
          )}

          <div>
            <label className="text-[#94A3B8] font-semibold mb-1 block">
              Bearer API Key (`X-API-Key`) *
            </label>
            <input
              type="text"
              required
              placeholder="pt_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#334155] rounded px-3 py-2 text-[#38BDF8] font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#94A3B8] font-semibold mb-1 block">Event Name *</label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="w-full bg-[#0B0E14] border border-[#334155] rounded px-3 py-2 text-[#F8FAFC] font-mono"
              />
            </div>
            <div>
              <label className="text-[#94A3B8] font-semibold mb-1 block">Distinct ID</label>
              <input
                type="text"
                value={distinctId}
                onChange={(e) => setDistinctId(e.target.value)}
                className="w-full bg-[#0B0E14] border border-[#334155] rounded px-3 py-2 text-[#F8FAFC] font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[#94A3B8] font-semibold mb-1 block">Metadata (JSONB)</label>
            <textarea
              rows={4}
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              className="w-full bg-[#0B0E14] border border-[#334155] rounded px-3 py-2 text-[#38BDF8] font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-3 border-t border-[#1E293B] flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-[#1A202C] hover:bg-[#242C3D] text-[#94A3B8] px-4 py-2 rounded font-medium"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white px-4 py-2 rounded font-semibold transition-all flex items-center gap-1.5 glow-primary"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Ingesting...' : 'Send Telemetry Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
