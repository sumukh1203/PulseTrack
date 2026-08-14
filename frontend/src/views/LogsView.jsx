import React, { useState } from 'react';
import { Terminal, Search, ShieldCheck } from 'lucide-react';

export default function LogsView() {
  const [requestIdFilter, setRequestIdFilter] = useState('');

  const sampleLogs = [
    { timestamp: '2026-08-10T12:25:56.123Z', level: 'INFO', request_id: 'req_f3a1c9', method: 'POST', path: '/v1/events', status: 202, duration: '12.4ms', client: 'NodeSDK' },
    { timestamp: '2026-08-10T12:25:57.456Z', level: 'INFO', request_id: 'req_8b2a10', method: 'GET', path: '/v1/applications', status: 200, duration: '8.1ms', client: 'DashboardUI' },
    { timestamp: '2026-08-10T12:25:58.890Z', level: 'INFO', request_id: 'req_1a9c4d', method: 'GET', path: '/v1/applications/6a1e5c2e/metrics', status: 200, duration: '18.9ms', client: 'DashboardUI' },
    { timestamp: '2026-08-10T12:26:01.002Z', level: 'WARN', request_id: 'req_99b0e1', method: 'POST', path: '/v1/events', status: 429, duration: '2.1ms', client: 'PythonSDK' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#111620] border border-[#1E293B] p-5 rounded-xl flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#F8FAFC] flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#38BDF8]" />
            Structured JSON Request Logs
          </h1>
          <p className="text-xs text-[#94A3B8]">
            HTTP access logs and request trace correlation (`X-Request-Id`)
          </p>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by X-Request-Id (e.g. req_f3a1c9)..."
            value={requestIdFilter}
            onChange={(e) => setRequestIdFilter(e.target.value)}
            className="bg-[#1A202C] text-xs text-[#F8FAFC] pl-8 pr-3 py-1.5 rounded border border-[#334155] font-mono focus:outline-none focus:border-indigo-500 w-72"
          />
        </div>
      </div>

      {/* Log Console Container */}
      <div className="bg-[#0B0E14] border border-[#334155] rounded-lg p-4 font-mono text-xs space-y-2 overflow-x-auto">
        {sampleLogs.map((log, idx) => (
          <div key={idx} className="flex items-center gap-3 py-1 hover:bg-[#111620] px-2 rounded">
            <span className="text-[#64748B]">{log.timestamp}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.level === 'WARN' ? 'bg-[#F59E0B]/20 text-[#F59E0B]' : 'bg-[#10B981]/20 text-[#10B981]'}`}>
              {log.level}
            </span>
            <span className="text-[#38BDF8]">[{log.request_id}]</span>
            <span className="text-white font-bold">{log.method}</span>
            <span className="text-[#94A3B8]">{log.path}</span>
            <span className={`font-bold ${log.status === 200 || log.status === 202 ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
              {log.status}
            </span>
            <span className="text-[#64748B] ml-auto">{log.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
