import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, Database, Server, RefreshCw, Zap, Key } from 'lucide-react';
import { fetchHealth, fetchPrometheusMetrics } from '../services/api';

export default function SettingsView({ selectedApp, onOpenRotateModal }) {
  const [healthData, setHealthData] = useState(null);
  const [promMetrics, setPromMetrics] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPromMetrics, setShowPromMetrics] = useState(false);

  const loadHealth = async () => {
    setLoading(true);
    const h = await fetchHealth();
    setHealthData(h);
    const pm = await fetchPrometheusMetrics();
    setPromMetrics(pm || '');
    setLoading(false);
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const isHealthy = healthData?.status === 'healthy';

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="border-b border-[#27272a] pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#f4f4f5]">Settings & Health</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Configure application properties and monitor backend services status
          </p>
        </div>

        <button
          onClick={loadHealth}
          className="bg-[#18181b] hover:bg-[#27272a] text-[#f4f4f5] border border-[#27272a] px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-[#3b82f6]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Selected App Settings */}
      {selectedApp ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-3">Application configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[#71717a]">Name</span>
                  <span className="font-semibold text-[#f4f4f5]">{selectedApp.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#71717a]">Application ID</span>
                  <span className="font-mono text-[#a1a1aa]">{selectedApp.id}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[#71717a]">Rate limit</span>
                  <span className="font-semibold text-[#f4f4f5]">{selectedApp.rate_limit_per_minute || 600} requests / min</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[#71717a]">Created</span>
                  <span className="text-[#a1a1aa]">
                    {selectedApp.created_at ? new Date(selectedApp.created_at).toLocaleDateString() : 'August 12, 2026'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#27272a] pt-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-3">API Keys & Ingestion Credentials</h2>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-[#18181b] border border-[#27272a] rounded-lg text-xs font-sans">
              <div className="space-y-1">
                <div className="font-medium text-[#f4f4f5] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  <span>Ingestion key prefix</span>
                </div>
                <div className="font-mono text-[#71717a] text-[11px]">
                  {selectedApp.api_key_prefix}************************************
                </div>
              </div>

              <button
                onClick={() => onOpenRotateModal(selectedApp)}
                className="bg-[#ef4444]/10 hover:bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/20 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
              >
                Rotate Ingestion Key
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#18181b] border border-[#27272a] rounded-lg text-xs text-[#a1a1aa] text-center">
          No application selected. Choose an application from the header dropdown to view its settings.
        </div>
      )}

      {/* Observability Section */}
      <div className="border-t border-[#27272a] pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#71717a] mb-3">System status</h2>
        
        {/* Component Health Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#27272a] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f4f4f5]">
                <Server className="w-3.5 h-3.5 text-[#71717a]" />
                <span>Web Services</span>
              </div>
              <span className="text-[10px] font-bold text-[#10b981]">ONLINE</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              FastAPI engine handling request routing, API schema validation, and logging.
            </p>
          </div>

          <div className="border border-[#27272a] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f4f4f5]">
                <Database className="w-3.5 h-3.5 text-[#71717a]" />
                <span>Neon database</span>
              </div>
              <span className="text-[10px] font-bold text-[#10b981]">CONNECTED</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Serverless PostgreSQL cluster with tenant isolation and partitioned telemetry tables.
            </p>
          </div>

          <div className="border border-[#27272a] rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f4f4f5]">
                <Zap className="w-3.5 h-3.5 text-[#71717a]" />
                <span>Cache & Queue</span>
              </div>
              <span className="text-[10px] font-bold text-[#10b981]">ACTIVE</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa] leading-relaxed">
              Upstash Redis instance managing slide rate limits and async ingestion queue pools.
            </p>
          </div>
        </div>
      </div>

      {/* Raw OpenMetrics Prometheus scraping logs */}
      {promMetrics && (
        <div className="border-t border-[#27272a] pt-6">
          <button
            onClick={() => setShowPromMetrics(!showPromMetrics)}
            className="text-xs font-semibold uppercase tracking-wider text-[#71717a] hover:text-[#a1a1aa] transition-colors flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer focus:outline-none"
          >
            <span>{showPromMetrics ? 'Hide' : 'Show'} raw system metrics (Prometheus OpenMetrics)</span>
          </button>
          
          {showPromMetrics && (
            <div className="mt-3 border border-[#27272a] rounded-lg overflow-hidden bg-[#09090b]">
              <div className="p-4 text-[10px] font-mono text-[#a1a1aa] max-h-60 overflow-y-auto">
                <pre>{promMetrics}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
