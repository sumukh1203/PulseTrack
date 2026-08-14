import React, { useState } from 'react';
import { Copy, Check, Key, Eye, Settings, ShieldAlert } from 'lucide-react';

export default function ApplicationTable({ applications = [], onSelectApp, onOpenRotateModal, onCreateApp }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#111620] border border-[#1E293B] rounded-lg overflow-hidden">
      {/* Table Action Bar */}
      <div className="p-4 border-b border-[#1E293B] flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-semibold text-[#F8FAFC]">Registered Tenant Applications</h2>
          <p className="text-xs text-[#94A3B8]">Manage application tenants, API keys, and rate limit rules</p>
        </div>
        <button
          onClick={onCreateApp}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white px-4 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-2 glow-primary"
        >
          <span>+ Create Application</span>
        </button>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1A202C] text-[#94A3B8] font-mono border-b border-[#1E293B]">
            <tr>
              <th className="py-3 px-4">Application Name</th>
              <th className="py-3 px-4">Application ID</th>
              <th className="py-3 px-4">API Key Prefix</th>
              <th className="py-3 px-4">Rate Limit</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E293B] text-[#F8FAFC]">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#64748B]">
                  <div className="flex flex-col items-center gap-2">
                    <ShieldAlert className="w-8 h-8 text-[#64748B]" />
                    <span className="text-sm font-medium">No applications registered yet.</span>
                    <button
                      onClick={onCreateApp}
                      className="mt-2 text-indigo-400 underline text-xs hover:text-indigo-300"
                    >
                      Provision your first application & API key
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-[#1A202C]/60 transition-colors">
                  <td className="py-3.5 px-4 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>{app.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                    <div className="flex items-center gap-1.5">
                      <span>{app.id.slice(0, 18)}...</span>
                      <button
                        onClick={() => handleCopy(app.id, app.id)}
                        className="text-[#64748B] hover:text-[#F8FAFC] transition-colors"
                        title="Copy Application ID"
                      >
                        {copiedId === app.id ? (
                          <Check className="w-3.5 h-3.5 text-[#10B981]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className="bg-[#1A202C] text-[#38BDF8] px-2 py-0.5 rounded border border-[#334155]">
                      {app.api_key_prefix}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[#94A3B8]">
                    {app.rate_limit_per_minute || 600} req/min
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20 px-2 py-0.5 rounded-full font-medium text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                      Active
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => onSelectApp(app)}
                      className="bg-[#1A202C] hover:bg-[#242C3D] text-[#38BDF8] border border-[#334155] px-2.5 py-1 rounded text-xs transition-all inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </button>
                    <button
                      onClick={() => onOpenRotateModal(app)}
                      className="bg-[#1A202C] hover:bg-[#242C3D] text-[#F59E0B] border border-[#334155] px-2.5 py-1 rounded text-xs transition-all inline-flex items-center gap-1"
                    >
                      <Key className="w-3.5 h-3.5" />
                      <span>Rotate Key</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
