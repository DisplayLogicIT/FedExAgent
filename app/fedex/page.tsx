'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

export default function FedExPage() {
  const [env, setEnv] = useState('sandbox');
  const [input, setInput] = useState('');
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

  // Find label data from tool results
  const labelData = messages.flatMap(m =>
    (m.parts || []).filter((p: { type: string; toolName?: string; output?: unknown }) => p.type === 'tool-create_shipment' && (p as { output?: { labelB64?: string } }).output?.labelB64)
  )[0] as { output?: { labelB64?: string; trackingNumber?: string; recipientName?: string; toCity?: string } } | undefined;

  function downloadLabel() {
    if (!labelData?.output?.labelB64) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${labelData.output.labelB64}`;
    link.download = `label-${labelData.output.trackingNumber || 'fedex'}.png`;
    link.click();
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

      <div className="chat-wrap">
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
            if (!text && m.role !== 'user') return null;
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

          {labelData?.output?.labelB64 && (
            <div className="card" style={{ maxWidth: 360 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Label Ready</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>
                Tracking: <span className="mono">{labelData.output.trackingNumber}</span><br />
                {labelData.output.recipientName} · {labelData.output.toCity}
              </div>
              <button className="btn btn-primary" onClick={downloadLabel}>⬇ Download Label (PNG)</button>
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

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
}
