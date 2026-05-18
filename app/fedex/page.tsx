'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState, useEffect, useRef } from 'react';

export default function FedExPage() {
  const [env, setEnv] = useState('sandbox');
  const [input, setInput] = useState('');
  const [panelClosedFor, setPanelClosedFor] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; mediaType: string; url: string }[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function ingestFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (!files.length) {
      alert('Only image files are supported right now (PNG, JPG, etc.). PDF support coming soon.');
      return;
    }
    const newAttachments = await Promise.all(files.map(async f => ({
      name: f.name,
      mediaType: f.type,
      url: await readFileAsDataUrl(f),
    })));
    setAttachments(prev => [...prev, ...newAttachments]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    if (attachments.length === 0) {
      sendMessage({ text: input || '' });
    } else {
      sendMessage({
        parts: [
          ...(input.trim() ? [{ type: 'text' as const, text: input }] : []),
          ...attachments.map(a => ({ type: 'file' as const, url: a.url, mediaType: a.mediaType })),
        ],
      });
    }
    setInput('');
    setAttachments([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  type LabelOutput = { labelZpl?: string; trackingNumber?: string; recipientName?: string; toCity?: string };
  const latestLabel = messages.flatMap(m =>
    (m.parts || []).filter((p: { type: string; output?: unknown }) => p.type === 'tool-create_shipment' && (p as { output?: LabelOutput }).output?.labelZpl)
  ).slice(-1)[0] as { output?: LabelOutput } | undefined;

  const labelZpl = latestLabel?.output?.labelZpl;
  const tracking = latestLabel?.output?.trackingNumber;
  const recipientName = latestLabel?.output?.recipientName;
  const toCity = latestLabel?.output?.toCity;
  const showPanel = !!labelZpl && panelClosedFor !== tracking;

  function downloadLabel() {
    if (!labelZpl) return;
    const link = document.createElement('a');
    link.href = `data:text/plain;base64,${labelZpl}`;
    link.download = `label-${tracking || 'fedex'}.zpl`;
    link.click();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">FedEx Shipping Agent</div>
          <div className="page-sub">
            <span className={`chip ${env}`}>{env === 'sandbox' ? 'Sandbox · Test labels for FedEx validation' : 'Production · Pending FedEx approval'}</span>
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

            <form
              onSubmit={handleSubmit}
              className="chat-input-row"
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                if (e.dataTransfer.files?.length) ingestFiles(e.dataTransfer.files);
              }}
              style={{
                position: 'relative',
                outline: dragActive ? '2px dashed var(--accent2)' : 'none',
                outlineOffset: -4,
                borderRadius: 12,
              }}
            >
              {dragActive && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(255,98,0,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none', borderRadius: 12, fontWeight: 600, color: 'var(--accent2)',
                  zIndex: 5,
                }}>
                  Drop image to attach
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                {attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '4px 0' }}>
                    {attachments.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 8px', borderRadius: 6,
                        background: 'var(--surface2)', border: '1px solid var(--border)',
                        fontSize: 12,
                      }}>
                        <img src={a.url} alt="" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 3 }} />
                        <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, fontSize: 14, lineHeight: 1 }}
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  className="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Who are you shipping to? Or drop an image..."
                  rows={1}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files) ingestFiles(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
                style={{ padding: '0 12px' }}
              >📎</button>
              <button type="submit" className="btn btn-primary" disabled={isLoading || (!input.trim() && attachments.length === 0)}>
                Send
              </button>
            </form>
          </div>
        </div>

        {showPanel && (
          <aside style={{
            width: 360,
            borderLeft: '1px solid var(--border)',
            background: 'var(--surface)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.25s ease-out',
          }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Label Ready</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>ZPL · Thermal printer format</div>
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

            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--surface2)' }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Tracking Number</div>
                <div className="mono" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '0.5px' }}>{tracking}</div>
              </div>

              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Ship To</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{recipientName || '—'}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 2 }}>{toCity || '—'}</div>
              </div>

              <div style={{ background: 'var(--accent-light)', border: '1px solid var(--accent)', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24 }}>🖨</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>ZPL Label Generated</div>
                  <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>Download and send to your Zebra or thermal printer</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={downloadLabel} style={{ width: '100%' }}>⬇ Download ZPL Label</button>
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
