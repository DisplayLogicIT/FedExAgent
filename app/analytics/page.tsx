import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export default async function AnalyticsPage() {
  const { userId } = await auth();

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('user_id', userId!)
    .order('created_at', { ascending: false });

  const all = shipments || [];
  const totalSpend = all.reduce((s: number, r: any) => s + (parseFloat(r.cost) || 0), 0);
  const avgCost = all.length ? (totalSpend / all.length).toFixed(2) : '0.00';
  const prodCount = all.filter((s: any) => s.env === 'production').length;

  // Service breakdown
  const serviceCounts: Record<string, number> = {};
  all.forEach((s: any) => {
    const n = s.service_name || s.service || 'Unknown';
    serviceCounts[n] = (serviceCounts[n] || 0) + 1;
  });
  const services = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1]);

  // Top recipients
  const recipientCounts: Record<string, number> = {};
  all.forEach((s: any) => {
    if (s.recipient) recipientCounts[s.recipient] = (recipientCounts[s.recipient] || 0) + 1;
  });
  const topRecipients = Object.entries(recipientCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Monthly breakdown (last 6 months)
  const months: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months[d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0;
  }
  all.forEach((s: any) => {
    const key = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (key in months) months[key]++;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Analytics</div>
          <div className="page-sub">Shipping performance overview</div>
        </div>
      </div>
      <div className="content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">Total Shipments</div>
            <div className="stat-value">{all.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spend</div>
            <div className="stat-value">${totalSpend.toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Cost</div>
            <div className="stat-value">${avgCost}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Production Labels</div>
            <div className="stat-value">{prodCount}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-title">Monthly Volume</div>
            {Object.keys(months).length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                {Object.entries(months).map(([month, count]) => {
                  const max = Math.max(...Object.values(months), 1);
                  const h = Math.max((count / max) * 80, count > 0 ? 8 : 2);
                  return (
                    <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{count || ''}</div>
                      <div style={{ width: '100%', height: h, background: count > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: 4 }} />
                      <div style={{ fontSize: 10, color: 'var(--muted2)' }}>{month}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Service Breakdown</div>
            {services.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No data yet</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {services.map(([name, count]) => {
                  const pct = Math.round((count / all.length) * 100);
                  return (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                        <span>{name}</span>
                        <span style={{ color: 'var(--muted)' }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {topRecipients.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">Top Recipients</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Recipient</th><th>Shipments</th></tr></thead>
                <tbody>
                  {topRecipients.map(([name, count], i) => (
                    <tr key={name}>
                      <td style={{ color: 'var(--muted)', width: 40 }}>#{i + 1}</td>
                      <td>{name}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
