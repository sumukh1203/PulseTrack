import React, { useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';

export default function ApplicationsView({ 
  applications = [], 
  onSelectApp, 
  onCreateApp, 
  onSelectTab
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenApp = (app) => {
    onSelectApp(app);
    if (onSelectTab) {
      onSelectTab('overview');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-[#27272a] pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#f4f4f5]">Applications</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Your connected applications</p>
        </div>

        <button
          onClick={onCreateApp}
          className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New application</span>
        </button>
      </div>

      {/* Flat List Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#27272a] text-[#71717a] font-normal">
              <th className="py-2.5 font-normal">Name</th>
              <th className="py-2.5 font-normal">Application ID</th>
              <th className="py-2.5 font-normal">Ingestion Key Prefix</th>
              <th className="py-2.5 font-normal">Status</th>
              <th className="py-2.5 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#18181b]">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-xs text-[#71717a]">
                  No applications found. Click "New application" to create one.
                </td>
              </tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="hover:bg-[#18181b]/30 transition-colors">
                  <td className="py-4 text-[#f4f4f5] font-semibold">{app.name}</td>
                  <td className="py-4 font-mono text-[#a1a1aa]">
                    <div className="flex items-center gap-1.5">
                      <span>{app.id}</span>
                      <button
                        onClick={() => handleCopy(app.id, app.id)}
                        className="text-[#71717a] hover:text-[#f4f4f5] transition-colors cursor-pointer"
                        title="Copy Application ID"
                      >
                        {copiedId === app.id ? (
                          <Check className="w-3 h-3 text-[#10b981]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="py-4 font-mono text-[#a1a1aa]">{app.api_key_prefix}</td>
                  <td className="py-4">
                    <span className="text-[11px] text-[#10b981] font-medium">Active</span>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => handleOpenApp(app)}
                      className="text-[#3b82f6] hover:text-[#2563eb] font-semibold transition-colors text-xs cursor-pointer"
                    >
                      Open
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
