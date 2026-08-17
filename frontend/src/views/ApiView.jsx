import React, { useState } from 'react';
import { Copy, Check, Shield, Zap } from 'lucide-react';

export default function ApiView({ selectedApp, onOpenSimulator }) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState('curl');

  const apiKeyPrefix = selectedApp?.api_key_prefix || 'pt_live_9f8a...';
  const appId = selectedApp?.id || '6a1e5c2e-2f3b-4b8a-9e3d-1a2b3c4d5e6f';

  const snippets = {
    curl: `# 1. Ingest a telemetry event
curl -X POST http://localhost:8000/v1/events \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_name": "button_click",
    "occurred_at": "${new Date().toISOString()}",
    "session_id": "sess_9f8a7b6c",
    "distinct_id": "user_42",
    "metadata": { "button_id": "cta-hero", "page": "/pricing" }
  }'`,

    js: `// PulseTrack Event Ingestion (JavaScript Fetch)
async function trackEvent(eventName, metadata = {}) {
  const response = await fetch('http://localhost:8000/v1/events', {
    method: 'POST',
    headers: {
      'X-API-Key': 'YOUR_API_KEY',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      event_name: eventName,
      occurred_at: new Date().toISOString(),
      session_id: 'sess_' + Math.random().toString(36).substr(2, 9),
      metadata: metadata,
    }),
  });

  return await response.json();
}

// Usage Example
trackEvent('button_click', { button_id: 'cta-hero', variant: 'B' });`,

    python: `# PulseTrack Event Ingestion (Python Requests)
import requests
from datetime import datetime, timezone

def track_event(event_name: str, metadata: dict = None):
    url = "http://localhost:8000/v1/events"
    headers = {
        "X-API-Key": "YOUR_API_KEY",
        "Content-Type": "application/json"
    }
    payload = {
        "event_name": event_name,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "distinct_id": "user_42",
        "metadata": metadata or {}
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Usage Example
track_event("user_signup", {"plan": "pro", "billing": "annual"})`,

    go: `// PulseTrack Event Ingestion (Go)
package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"time"
)

type EventPayload struct {
	EventName  string                 \`json:"event_name"\`
	OccurredAt string                 \`json:"occurred_at"\`
	Metadata   map[string]interface{} \`json:"metadata"\`
}

func main() {
	payload := EventPayload{
		EventName:  "purchase",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		Metadata:   map[string]interface{}{"amount": 99.0, "currency": "USD"},
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest("POST", "http://localhost:8000/v1/events", bytes.NewBuffer(body))
	req.Header.Set("X-API-Key", "YOUR_API_KEY")
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	client.Do(req)
}`,
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(apiKeyPrefix);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-[#27272a] pb-4 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#f4f4f5]">API & Integration</h1>
          <p className="text-xs text-[#a1a1aa] mt-0.5">Send events to PulseTrack</p>
        </div>

        {selectedApp && (
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-[#27272a] text-[#3b82f6] border border-[#27272a] px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer"
            title="Send test telemetry event"
          >
            <Zap className="w-3.5 h-3.5 text-[#3b82f6]" />
            <span>Test Ingest</span>
          </button>
        )}
      </div>

      {/* API Reference Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-[#f4f4f5] text-xs">Endpoint</h3>
            <div className="mt-1.5 p-2.5 bg-[#18181b] rounded border border-[#27272a] font-mono text-[11px] text-[#f4f4f5]">
              POST /v1/events
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[#f4f4f5] text-xs">Authentication</h3>
            <p className="text-[#a1a1aa] mt-1 mb-2 leading-relaxed">
              Authenticate requests by passing your API Key in the <code className="text-[#3b82f6] bg-[#3b82f6]/10 px-1 rounded">X-API-Key</code> header.
            </p>
            {selectedApp && (
              <div className="flex items-center justify-between p-2.5 bg-[#18181b] rounded border border-[#27272a] font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-[#10b981]" />
                  <span className="text-[#71717a]">Prefix:</span>
                  <span className="text-[#3b82f6] font-bold">{apiKeyPrefix}</span>
                </div>
                <button
                  onClick={handleCopyKey}
                  className="p-1 text-[#71717a] hover:text-[#f4f4f5] transition-colors cursor-pointer"
                  title="Copy API key prefix"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-[#a1a1aa] leading-relaxed space-y-2">
          <h3 className="font-semibold text-[#f4f4f5] text-xs">Fast Ingest</h3>
          <p>
            PulseTrack ingests events via low-latency serverless routes. Captured events are buffered, rate-limited, and persisted to Neon Postgres in batches.
          </p>
          <p>
            Ensure payloads are valid JSON and include an event name. Optional properties include distinct ID, session ID, and arbitrary metadata key-values.
          </p>
        </div>
      </div>

      {/* Snippet Code Tabs */}
      <div className="border border-[#27272a] rounded-lg overflow-hidden bg-[#09090b]">
        <div className="bg-[#18181b] border-b border-[#27272a] px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {['curl', 'js', 'python', 'go'].map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveTab(lang)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer ${
                  activeTab === lang
                    ? 'bg-[#27272a] text-[#f4f4f5]'
                    : 'text-[#71717a] hover:text-[#f4f4f5]'
                }`}
              >
                {lang === 'curl' ? 'cURL' : lang === 'js' ? 'JavaScript' : lang.toUpperCase()}
              </button>
            ))}
          </div>

          <span className="text-[10px] font-mono text-[#71717a]">HTTPS / JSON API</span>
        </div>

        <div className="p-4 font-mono text-[11px] text-[#f4f4f5] overflow-x-auto bg-[#09090b]">
          <pre>{snippets[activeTab]}</pre>
        </div>
      </div>
    </div>
  );
}
