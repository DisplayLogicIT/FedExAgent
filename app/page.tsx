import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import DefaultShipperCard from '@/components/default-shipper-card';

export default async function HomePage() {
  const { userId } = await auth();

  const [{ count: totalShipments }, { count: totalAddresses }, { data: recentShipments }, { data: monthShipments }] =
    await Promise.all([
      supabaseAdmin.from('shipments').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
      supabaseAdmin.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
      supabaseAdmin.from('shipments').select('*').eq('user_id', userId!).order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('shipments').select('cost').eq('user_id', userId!).gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

  const totalSpend = (monthShipments || []).reduce((sum: number, s: any) => sum + (parseFloat(s.cost) || 0), 0);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <Link href="/fedex" className="btn btn-primary">+ New Shipment</Link>
      </div>

      <div className="content">
        <DefaultShipperCard />

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Shipments</div>
            <div className="stat-value">{totalShipments ?? 0}</div>
            <div className="stat-sub">All time</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">This Month</div>
            <div className="stat-value">${totalSpend.toFixed(2)}</div>
            <div className="stat-sub">Total spend</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Address Book</div>
            <div className="stat-value">{totalAddresses ?? 0}</div>
            <div className="stat-sub">Contacts</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Environment</div>
            <div className="stat-value" style={{ fontSize: 16, marginTop: 4 }}>
              <span className="chip production">Production</span>
            </div>
            <div className="stat-sub">Real labels · Real charges</div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Recent Shipments
            <Link href="/history" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          {!recentShipments?.length ? (
            <div className="empty-state">
              <p>No shipments yet — <Link href="/fedex" style={{ color: '#c084fc' }}>create your first one</Link></p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Tracking</th><th>Recipient</th><th>Service</th><th>Env</th>
                  </tr>
                </thead>
                <tbody>
                  {recentShipments.map((s: any) => (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleDateString()}</td>
                      <td><span className="mono">{s.tracking || '—'}</span></td>
                      <td>{s.recipient || '—'}</td>
                      <td style={{ color: 'var(--muted)' }}>{s.service_name || s.service || '—'}</td>
                      <td><span className={`chip ${s.env}`}>{s.env}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/fedex" className="btn btn-primary">📦 New Shipment</Link>
          <Link href="/address-book" className="btn btn-ghost">◎ Address Book</Link>
        </div>
      </div>
    </>
  );
}
