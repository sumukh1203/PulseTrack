import React, { useState } from 'react';
import { X, ShieldAlert, Key, Check, Copy } from 'lucide-react';
import { rotateApiKey } from '../services/api';

export default function RotateKeyModal({ isOpen, app, onClose, onRotated }) {
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rotationResult, setRotationResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  if (!isOpen || !app) return null;

  const isConfirmed = confirmName.trim() === app.name.trim();

  const handleRotate = async (e) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setLoading(true);
    setError(null);
    try {
      const res = await rotateApiKey(app.id);
      setRotationResult(res);
      if (onRotated) onRotated(res);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to rotate API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (rotationResult?.api_key) {
      navigator.clipboard.writeText(rotationResult.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 3000);
    }
  };

  const handleClose = () => {
    setConfirmName('');
    setRotationResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-lg glass-modal rounded-xl overflow-hidden border border-[#334155] shadow-2xl">
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F59E0B]">
            <Key className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#F8FAFC]">Rotate Ingestion API Key</h3>
          </div>
          <button onClick={handleClose} className="text-[#64748B] hover:text-[#F8FAFC]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {rotationResult ? (
            <div className="space-y-4">
              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-md text-[#10B981] text-xs font-semibold">
                ✓ Key successfully rotated for {app.name}!
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-1.5 block">
                  New Raw API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={rotationResult.api_key}
                    className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2.5 font-mono text-xs text-[#38BDF8] select-all"
                  />
                  <button
                    onClick={handleCopyKey}
                    className={`px-4 py-2.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
                      copiedKey ? 'bg-[#10B981] text-white' : 'bg-[#6366F1] text-white'
                    }`}
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-[#1A202C] hover:bg-[#242C3D] text-[#F8FAFC] font-semibold py-2.5 rounded-md text-xs border border-[#334155]"
              >
                Close & Return
              </button>
            </div>
          ) : (
            <form onSubmit={handleRotate} className="space-y-4">
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs leading-relaxed flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Breaking Action Warning</span>
                  Rotating the API key will <strong>immediately revoke</strong> key prefix{' '}
                  <code className="font-mono bg-black/40 px-1 py-0.5 rounded">{app.api_key_prefix}</code>. Any active client SDKs using the old key will fail to ingest events!
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-md text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="text-xs text-[#94A3B8] mb-1.5 block">
                  To confirm, type application name <strong className="text-white font-mono">{app.name}</strong>:
                </label>
                <input
                  type="text"
                  required
                  placeholder={app.name}
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#F8FAFC] font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="bg-[#1A202C] hover:bg-[#242C3D] text-[#94A3B8] px-4 py-2 rounded-md text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isConfirmed || loading}
                  className="bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-40 text-white px-4 py-2 rounded-md text-xs font-semibold transition-all"
                >
                  {loading ? 'Revoking & Generating...' : 'Confirm Key Rotation'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
