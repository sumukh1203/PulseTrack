import React, { useState } from 'react';
import { X, Copy, Check, ShieldAlert, Key } from 'lucide-react';
import { createApplication } from '../services/api';

export default function CreateAppModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [rateLimit, setRateLimit] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // One-time API Key display state
  const [createdResult, setCreatedResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [confirmedSave, setConfirmedSave] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await createApplication({
        name,
        owner_email: ownerEmail,
        rate_limit_per_minute: Number(rateLimit),
      });
      setCreatedResult(res);
      onCreated(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create application.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (createdResult?.api_key) {
      navigator.clipboard.writeText(createdResult.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const handleFinish = () => {
    setCreatedResult(null);
    setName('');
    setOwnerEmail('');
    setRateLimit(600);
    setConfirmedSave(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg glass-modal rounded-xl overflow-hidden border border-[#334155] shadow-2xl">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-[#F8FAFC]">
              {createdResult ? '⚠️ Save Secret Ingestion API Key' : 'Create New Application'}
            </h3>
          </div>
          <button
            onClick={handleFinish}
            className="text-[#64748B] hover:text-[#F8FAFC] p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Key Banner */}
        <div className="p-6">
          {createdResult ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">One-Time Secret Key Generation</span>
                  Please copy your secret API key below right now. PulseTrack only stores a cryptographically salted hash—you will <strong>not</strong> be able to view this key again!
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5 block">
                  Raw Bearer API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdResult.api_key}
                    className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2.5 font-mono text-xs text-[#38BDF8] select-all focus:outline-none"
                  />
                  <button
                    onClick={handleCopyKey}
                    className={`px-4 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                      copiedKey
                        ? 'bg-[#10B981] text-white glow-success'
                        : 'bg-[#6366F1] hover:bg-[#4F46E5] text-white glow-primary'
                    }`}
                  >
                    {copiedKey ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="confirmSave"
                  checked={confirmedSave}
                  onChange={(e) => setConfirmedSave(e.target.checked)}
                  className="rounded border-[#334155] bg-[#0B0E14] text-indigo-500 focus:ring-indigo-500"
                />
                <label htmlFor="confirmSave" className="text-xs text-[#94A3B8] cursor-pointer">
                  I have copied and saved this API key in my environment variables.
                </label>
              </div>

              <button
                disabled={!confirmedSave}
                onClick={handleFinish}
                className="w-full mt-4 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-semibold py-2.5 rounded-md text-xs transition-all shadow-md"
              >
                Done & Close Modal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1 block">
                  Application Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing Dashboard API"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1 block">
                  Owner Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="developer@company.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] mb-1 block">
                  Default Rate Limit (Requests / Min)
                </label>
                <input
                  type="number"
                  min={60}
                  max={10000}
                  value={rateLimit}
                  onChange={(e) => setRateLimit(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#1A202C] hover:bg-[#242C3D] text-[#94A3B8] px-4 py-2 rounded-md text-xs font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] disabled:opacity-50 text-white px-4 py-2 rounded-md text-xs font-semibold transition-all glow-primary"
                >
                  {loading ? 'Generating...' : 'Provision App & Key'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
