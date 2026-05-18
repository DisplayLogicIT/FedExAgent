import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export default async function HistoryPage() {
  const { userId } = await auth();

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('user_id', userId!)
    .order('created_at', { ascending: false });

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Shipment History</div>
          <div className="page-sub">{shipments?.length ?? 0} total shipments</div>
        </div>
      </div>
      <div className="content">
        {!shipments?.length ? (
          <div className="empty-state">
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <p>No shipments yet. Create one from the FedEx Agent.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tracking #</th>
                  <th>Recipient</th>
                  <th>Destination</th>
                  <th>Service</th>
                  <th>Cost</th>
                  <th>Env</th>
                  <th>Label</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s: any) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <a
                        href={`https://www.fedex.com/fedextrack/?trknbr=${s.tracking}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{ color: '#c084fc' }}
                      >
                        {s.tracking || '—'}
                      </a>
                    </td>
                    <td>{s.recipient || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{s.to_city || '—'}</td>
                    <td style={{ color: 'var(--muted)' }}>{s.service_name || s.service || '—'}</td>
                    <td>{s.cost ? `$${parseFloat(s.cost).toFixed(2)}` : '—'}</td>
                    <td><span className={`chip ${s.env}`}>{s.env}</span></td>
                    <td>
                      {s.label_b64 ? (
                        <a
                          href={`data:text/plain;base64,${s.label_b64}`}
                          download={`label-${s.tracking}.zpl`}
                          className="btn btn-ghost btn-sm"
                        >
                          ⬇
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
