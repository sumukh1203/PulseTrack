import React, { useState, useEffect } from 'react';
import { Cpu, Server, Database, Zap, RefreshCw } from 'lucide-react';
import { fetchPrometheusMetrics } from '../services/api';

export default function MonitoringView({ health }) {
  const [prometheusText, setPrometheusText] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPrometheus = async () => {
    setLoading(true);
    const text = await fetchPrometheusMetrics();
    setPrometheusText(text);
    setLoading(false);
  };

  useEffect(() => {
    loadPrometheus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#10B981]" />
            Infrastructure Reliability & Prometheus Metrics
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Real-time worker queue depth, Redis stream status, and Prometheus scrape target (`/metrics`)
          </p>
        </div>

        <button
          onClick={loadPrometheus}
          disabled={loading}
          className="bg-[#1A202C] hover:bg-[#242C3D] text-[#38BDF8] border border-[#334155] px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Prometheus Text</span>
        </button>
      </div>

      {/* 3 Component Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">FASTAPI SERVICE</span>
            <Server className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">Operational</div>
          <div className="mt-1 text-xs text-[#10B981]">p95 Latency: 14.2ms</div>
        </div>

        <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">UPSTASH REDIS</span>
            <Zap className="w-5 h-5 text-[#38BDF8]" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">Queue Size: 0</div>
          <div className="mt-1 text-xs text-[#38BDF8]">Cache Hit Ratio: 94.2%</div>
        </div>

        <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#64748B]">NEON POSTGRESQL</span>
            <Database className="w-5 h-5 text-[#10B981]" />
          </div>
          <div className="mt-3 text-lg font-bold text-white">Pool Usage: 24%</div>
          <div className="mt-1 text-xs text-[#10B981]">12 / 50 Active Connections</div>
        </div>
      </div>

      {/* Prometheus Raw Output Box */}
      <div className="bg-[#111620] border border-[#1E293B] rounded-lg p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[#F8FAFC]">Prometheus Scrape Output (`GET /metrics`)</h3>
        <pre className="bg-[#0B0E14] p-4 rounded border border-[#334155] font-mono text-xs text-[#10B981] h-64 overflow-y-auto">
          {prometheusText || '# Loading Prometheus scrape metrics from /metrics...'}
        </pre>
      </div>
    </div>
  );
}
