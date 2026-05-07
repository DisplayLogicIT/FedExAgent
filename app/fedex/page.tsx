'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

export default function FedExPage() {
  const [env, setEnv] = useState('sandbox');
  const [input, setInput] = useState('');
  const [panelClosedFor, setPanelClosedFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem('fedex_env');
    if (stored) setEnv(stored);
    const handler = (e: Event) => setEnv((e as CustomEvent).detail);
    window.addEventListener('envchange', handler);
    return () => window.removeEventListener('envchange', handler);
  }, []);

  const { messages, status, sendMessage } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat', body: { env } }),
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  type LabelOutput = { labelB64?: string; trackingNumber?: string; recipientName?: string; toCity?: string };
  const latestLabel = messages.flatMap(m =>
    (m.parts || []).filter((p: { type: string; output?: unknown }) => p.type === 'tool-create_shipment' && (p as { output?: LabelOutput }).output?.labelB64)
  ).slice(-1)[0] as { output?: LabelOutput } | undefined;

  const labelB64 = latestLabel?.output?.labelB64;
  const tracking = latestLabel?.output?.trackingNumber;
  const showPanel = !!labelB64 && panelClosedFor !== tracking;

  function downloadLabel() {
    if (!labelB64) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${labelB64}`;
    link.download = `label-${tracking || 'fedex'}.png`;
    link.click();
  }

  function printLabel() {
    if (!labelB64) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Label ${tracking || ''}</title><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:100vh}</style></head><body><img src="data:image/png;base64,${labelB64}" onload="window.print()" /></body></html>`);
    w.document.close();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">FedEx Shipping Agent</div>
          <div className="page-sub">
            <span className={`chip ${env}`}>{env === 'sandbox' ? 'Sandbox Mode' : 'Production Mode'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', height: 'calc(100vh - 72px)', overflow: 'hidden' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="chat-wrap" style={{ flex: 1, minHeight: 0 }}>
            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="empty-state" style={{ marginTop: 60 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                  <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>FedEx Shipping Agent</p>
                  <p style={{ color: 'var(--muted)', maxWidth: 400, margin: '0 auto' }}>
                    Tell me who you want to ship to and I&apos;ll look up rates, create a label, and handle the tracking.
                  </p>
                  <div style={{ marginTop: 20, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {['Ship to Boston Scientific', 'Get rates to Chicago', 'Track shipment 794123456789', 'Show my address book'].map(p => (
                      <button key={p} className="btn btn-ghost btn-sm" onClick={() => setInput(p)}>{p}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const textParts = (m.parts || []).filter((p: { type: string }) => p.type === 'text');
                const text = textParts.map((p: { type: string; text?: string }) => p.text || '').join('');
                if (!text) return null;
                return (
                  <div key={m.id} className={`msg ${m.role}`}>
                    <div className="msg-bubble">{text}</div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="msg assistant">
                  <div className="msg-bubble" style={{ color: 'var(--muted)' }}>
                    <span style={{ display: 'inline-flex', gap: 4 }}>
                      <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                      <span style={{ animation: 'pulse 1s infinite 0.2s' }}>●</span>
                      <span style={{ animation: 'pulse 1s infinite 0.4s' }}>●</span>
                    </span>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-input-row">
              <textarea
                className="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Who are you shipping to? Or ask anything..."
                rows={1}
              />
              <button type="submit" className="btn btn-primary" disabled={isLoading || !input.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>

        {showPanel && (
          <aside style={{
            width: 420,
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.25s ease-out',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Label Ready</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  Tracking: <span className="mono">{tracking}</span>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setPanelClosedFor(tracking || null)}
                title="Close panel"
                style={{ padding: '4px 10px', fontSize: 16 }}
              >
                ×
              </button>
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 18, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'var(--surface2)' }}>
              <img
                src={`data:image/png;base64,${labelB64}`}
                alt="Shipping label"
                style={{ maxWidth: '100%', height: 'auto', borderRadius: 6, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', background: '#fff' }}
              />
            </div>

            <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={downloadLabel} style={{ flex: 1 }}>⬇ Download PNG</button>
              <button className="btn btn-ghost" onClick={printLabel} style={{ flex: 1 }}>⎙ Print</button>
            </div>
          </aside>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}
