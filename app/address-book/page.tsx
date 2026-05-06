'use client';

import { useState, useEffect, useCallback } from 'react';

interface Address {
  id: string; name: string; company?: string; street: string; street2?: string;
  city: string; state?: string; zip?: string; country?: string; phone?: string;
  email?: string; residential?: boolean; is_default?: boolean;
}

export default function AddressBookPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Address> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = search ? `?q=${encodeURIComponent(search)}` : '';
    const data = await fetch(`/api/addresses${q}`).then(r => r.json());
    setAddresses(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    setSaving(false);
    setEditing(null);
    load();
  }

  async function deleteAddress(id: string) {
    if (!confirm('Delete this contact?')) return;
    await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
    load();
  }

  const displayed = addresses.slice(0, 200);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Address Book</div>
          <div className="page-sub">{addresses.length} contacts</div>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add Contact</button>
      </div>
      <div className="content">
        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="Search by name or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', padding: 20 }}>Loading...</div>
        ) : addresses.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
            <p>No contacts found.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Company</th><th>Address</th><th>Phone</th><th>Type</th><th></th>
                </tr>
              </thead>
              <tbody>
                {displayed.map(a => (
                  <tr key={a.id}>
                    <td>
                      {a.is_default && <span className="chip ok" style={{ marginRight: 6, fontSize: 10 }}>Default</span>}
                      {a.name}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{a.company || '—'}</td>
                    <td style={{ color: 'var(--muted)', fontSize: 12 }}>
                      {a.street}{a.city ? `, ${a.city}` : ''}{a.state ? ` ${a.state}` : ''} {a.zip || ''}
                    </td>
                    <td style={{ color: 'var(--muted)' }}>{a.phone || '—'}</td>
                    <td>
                      <span className="chip" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                        {a.residential ? 'Residential' : 'Commercial'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ marginRight: 6 }} onClick={() => setEditing(a)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--err)' }} onClick={() => deleteAddress(a.id)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {addresses.length > 200 && (
              <div style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>
                Showing 200 of {addresses.length}. Use search to filter.
              </div>
            )}
          </div>
        )}
      </div>

      {editing !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>
              {editing.id ? 'Edit Contact' : 'New Contact'}
            </div>
            <form onSubmit={saveAddress}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={editing.company || ''} onChange={e => setEditing({ ...editing, company: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Street *</label>
                <input className="form-input" value={editing.street || ''} onChange={e => setEditing({ ...editing, street: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Street 2</label>
                <input className="form-input" value={editing.street2 || ''} onChange={e => setEditing({ ...editing, street2: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input className="form-input" value={editing.city || ''} onChange={e => setEditing({ ...editing, city: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-input" value={editing.state || ''} onChange={e => setEditing({ ...editing, state: e.target.value })} maxLength={2} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ZIP</label>
                  <input className="form-input" value={editing.zip || ''} onChange={e => setEditing({ ...editing, zip: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input className="form-input" value={editing.country || 'US'} onChange={e => setEditing({ ...editing, country: e.target.value })} maxLength={2} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editing.residential} onChange={e => setEditing({ ...editing, residential: e.target.checked })} />
                  Residential
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!editing.is_default} onChange={e => setEditing({ ...editing, is_default: e.target.checked })} />
                  Set as default shipper
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
