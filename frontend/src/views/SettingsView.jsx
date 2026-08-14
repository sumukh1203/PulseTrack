import React from 'react';
import { Settings, ShieldAlert } from 'lucide-react';

export default function SettingsView({ selectedApp }) {
  return (
    <div className="space-y-6">
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl">
        <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#94A3B8]" />
          PulseTrack Application Settings
        </h1>
        <p className="text-xs text-[#94A3B8]">
          Configure workspace environment settings, default rate limits, and application soft deactivation
        </p>
      </div>

      <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-6 space-y-6 text-xs text-[#F8FAFC]">
        <div>
          <h3 className="text-sm font-semibold mb-2">Ingestion Rate Limiting</h3>
          <p className="text-[#94A3B8] mb-3">
            Default rate limit assigned to newly provisioned tenant applications:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              defaultValue={600}
              className="bg-[#0B0E14] border border-[#334155] rounded px-3 py-2 text-xs font-mono text-[#38BDF8] w-48"
            />
            <span className="text-[#94A3B8]">requests per minute</span>
          </div>
        </div>

        <div className="pt-6 border-t border-[#1E293B] space-y-3">
          <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Danger Zone — Soft Application Deactivation
          </h3>
          <p className="text-[#94A3B8]">
            Soft deactivating an application retains historical telemetry events in PostgreSQL while immediately rejecting any new ingestion requests (`POST /v1/events`) with `401 Unauthorized`.
          </p>
          <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 font-semibold px-4 py-2 rounded text-xs">
            Soft Deactivate Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
