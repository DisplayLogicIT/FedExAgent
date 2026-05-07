'use client';

import { useState, useEffect } from 'react';

type Shipper = {
  id?: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
};

const EMPTY: Shipper = { name: '', company: '', phone: '', email: '', street: '', street2: '', city: '', state: '', zip: '', country: 'US' };

export default function DefaultShipperCard() {
  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Shipper>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/addresses').then(r => r.json());
    const def = Array.isArray(res) ? res.find((a: { is_default?: boolean }) => a.is_default) : null;
    setShipper(def || null);
    if (!def) setEditing(true);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startEdit() {
    setDraft(shipper ? { ...EMPTY, ...shipper } : EMPTY);
    setEditing(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name || !draft.street || !draft.city || !draft.state || !draft.zip) {
      alert('Name, street, city, state, and ZIP are required.');
      return;
    }
    setSaving(true);
    await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...draft, is_default: true }),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  if (loading) return null;

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-title">
        <span>Default Shipper {shipper && !editing && <span className="chip ok" style={{ marginLeft: 8, fontSize: 10 }}>Saved</span>}</span>
        {shipper && !editing && (
          <button className="btn btn-ghost btn-sm" onClick={startEdit}>Edit</button>
        )}
      </div>

      {!editing && shipper && (
        <div style={{ padding: '4px 4px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
          <div>
            <div style={{ fontWeight: 600 }}>{shipper.name}</div>
            {shipper.company && <div style={{ color: 'var(--muted)' }}>{shipper.company}</div>}
            <div style={{ color: 'var(--muted)', marginTop: 4 }}>
              {shipper.street}{shipper.street2 ? `, ${shipper.street2}` : ''}<br />
              {shipper.city}, {shipper.state} {shipper.zip} {shipper.country && shipper.country !== 'US' ? shipper.country : ''}
            </div>
          </div>
          <div style={{ color: 'var(--muted)' }}>
            {shipper.phone && <div>📞 {shipper.phone}</div>}
            {shipper.email && <div>✉ {shipper.email}</div>}
            <div style={{ fontSize: 11, marginTop: 8, color: 'var(--muted2)' }}>
              The agent uses this as the FROM address for every shipment.
            </div>
          </div>
        </div>
      )}

      {editing && (
        <form onSubmit={save} style={{ padding: '4px 4px 8px' }}>
          {!shipper && (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
              Set this once — every label uses this as the FROM address.
            </div>
          )}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Company</label>
              <input className="form-input" value={draft.company || ''} onChange={e => setDraft({ ...draft, company: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Street *</label>
            <input className="form-input" value={draft.street} onChange={e => setDraft({ ...draft, street: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Street 2</label>
            <input className="form-input" value={draft.street2 || ''} onChange={e => setDraft({ ...draft, street2: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">City *</label>
              <input className="form-input" value={draft.city} onChange={e => setDraft({ ...draft, city: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <input className="form-input" maxLength={2} value={draft.state} onChange={e => setDraft({ ...draft, state: e.target.value.toUpperCase() })} required />
            </div>
            <div className="form-group">
              <label className="form-label">ZIP *</label>
              <input className="form-input" value={draft.zip} onChange={e => setDraft({ ...draft, zip: e.target.value })} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={draft.phone || ''} onChange={e => setDraft({ ...draft, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={draft.email || ''} onChange={e => setDraft({ ...draft, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-input" maxLength={2} value={draft.country || 'US'} onChange={e => setDraft({ ...draft, country: e.target.value.toUpperCase() })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            {shipper && (
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            )}
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (shipper ? 'Update Shipper' : 'Save as Default Shipper')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
