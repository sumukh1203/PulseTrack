import React, { useState } from 'react';
import ApplicationTable from '../components/ApplicationTable';
import ChartContainer from '../components/ChartContainer';
import { Server, Key, BarChart3, Activity, Settings, ArrowLeft, Copy, Check } from 'lucide-react';

export default function ApplicationsView({ 
  applications = [], 
  selectedApp, 
  onSelectApp, 
  onCreateApp, 
  onOpenRotateModal 
}) {
  const [subTab, setSubTab] = useState('overview');
  const [copiedAppId, setCopiedAppId] = useState(false);

  if (!selectedApp) {
    return (
      <ApplicationTable
        applications={applications}
        onSelectApp={onSelectApp}
        onOpenRotateModal={onOpenRotateModal}
        onCreateApp={onCreateApp}
      />
    );
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(selectedApp.id);
    setCopiedAppId(true);
    setTimeout(() => setCopiedAppId(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & App Details Header */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectApp(null)}
              className="p-1.5 bg-[#1A202C] hover:bg-[#242C3D] text-[#94A3B8] hover:text-[#F8FAFC] rounded-md transition-colors border border-[#334155]"
              title="Back to All Applications"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-[#F8FAFC]">{selectedApp.name}</h1>
                <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-[#94A3B8] font-mono">
                <span>ID: {selectedApp.id}</span>
                <button onClick={handleCopyId} className="text-[#64748B] hover:text-white">
                  {copiedAppId ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenRotateModal(selectedApp)}
              className="bg-[#1A202C] hover:bg-[#242C3D] text-[#F59E0B] border border-[#334155] px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Rotate Key</span>
            </button>
          </div>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex border-b border-[#1E293B] gap-6 text-xs font-medium text-[#94A3B8]">
          {[
            { id: 'overview', label: 'Overview', icon: Server },
            { id: 'metrics', label: 'Metrics Rollup', icon: BarChart3 },
            { id: 'events', label: 'Live Events', icon: Activity },
            { id: 'security', label: 'API Key & Security', icon: Key },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = subTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`pb-3 flex items-center gap-2 transition-all border-b-2 ${
                  active
                    ? 'border-[#6366F1] text-[#F8FAFC] font-semibold'
                    : 'border-transparent text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#6366F1]' : 'text-[#64748B]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Tab Contents */}
      {subTab === 'overview' && (
        <div className="space-y-6">
          <ChartContainer title={`24-Hour Telemetry Volume — ${selectedApp.name}`} type="line" />

          <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg space-y-3">
            <h3 className="text-sm font-semibold text-[#F8FAFC]">Fast Ingestion Integration Snippet</h3>
            <p className="text-xs text-[#94A3B8]">Use cURL or any HTTP client to ingest events for this application:</p>
            <pre className="bg-[#0B0E14] p-4 rounded border border-[#334155] font-mono text-xs text-[#38BDF8] overflow-x-auto">
{`curl -X POST "http://localhost:8000/v1/events" \\
  -H "X-API-Key: ${selectedApp.api_key_prefix}..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_name": "button_click",
    "distinct_id": "user_42",
    "session_id": "sess_9f8a2b3c",
    "metadata": { "page": "/pricing", "variant": "B" }
  }'`}
            </pre>
          </div>
        </div>
      )}

      {subTab === 'metrics' && (
        <ChartContainer title={`Event Volume Rollup for ${selectedApp.name}`} type="bar" />
      )}

      {subTab === 'events' && (
        <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-5 text-center text-xs text-[#94A3B8]">
          Listening for live incoming events for <strong className="text-white">{selectedApp.name}</strong>...
        </div>
      )}

      {subTab === 'security' && (
        <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">API Key Credentials</h3>
          <div className="p-3 bg-[#1A202C] rounded border border-[#334155] font-mono flex items-center justify-between">
            <span className="text-[#38BDF8]">Prefix: {selectedApp.api_key_prefix}</span>
            <span className="text-[#10B981]">Hash Method: CSPRNG PBKDF2</span>
          </div>
          <button
            onClick={() => onOpenRotateModal(selectedApp)}
            className="bg-[#F59E0B] text-black font-semibold px-4 py-2 rounded text-xs"
          >
            Rotate Ingestion Key
          </button>
        </div>
      )}

      {subTab === 'settings' && (
        <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-[#F8FAFC]">Application Settings & Danger Zone</h3>
          <p className="text-[#94A3B8]">Rate limit per minute: {selectedApp.rate_limit_per_minute || 600} req/min</p>
        </div>
      )}
    </div>
  );
}
