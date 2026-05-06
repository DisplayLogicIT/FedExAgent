import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export default async function SettingsPage() {
  const { userId } = await auth();

  const [{ data: profile }, { data: defaultShipper }, { count: addrCount }, { count: shipCount }] =
    await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('user_id', userId!).single(),
      supabaseAdmin.from('addresses').select('*').eq('user_id', userId!).eq('is_default', true).single(),
      supabaseAdmin.from('addresses').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
      supabaseAdmin.from('shipments').select('*', { count: 'exact', head: true }).eq('user_id', userId!),
    ]);

  const fedexConfigured = !!(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_CLIENT_SECRET);
  const prodConfigured = !!(process.env.FEDEX_PROD_CLIENT_ID && process.env.FEDEX_PROD_CLIENT_SECRET);
  const anthropicConfigured = !!process.env.ANTHROPIC_API_KEY;
  const accountNumber = process.env.FEDEX_ACCOUNT_NUMBER ? '****' + process.env.FEDEX_ACCOUNT_NUMBER.slice(-4) : null;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Platform configuration</div>
        </div>
      </div>
      <div className="content">

        <div className="section-title">API Credentials</div>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>FedEx Sandbox</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Account {accountNumber || 'not set'}</div>
              </div>
              <span className={`chip ${fedexConfigured ? 'ok' : 'err'}`}>
                {fedexConfigured ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>FedEx Production</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Add FEDEX_PROD_CLIENT_ID to environment</div>
              </div>
              <span className={`chip ${prodConfigured ? 'ok' : 'sandbox'}`}>
                {prodConfigured ? '✓ Configured' : '○ Not set'}
              </span>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Anthropic AI</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>Powers the agent chat</div>
              </div>
              <span className={`chip ${anthropicConfigured ? 'ok' : 'err'}`}>
                {anthropicConfigured ? '✓ Connected' : '✗ Missing'}
              </span>
            </div>
          </div>
        </div>

        <div className="section-title">Default Shipper</div>
        <div className="card">
          {defaultShipper ? (
            <div>
              <div style={{ fontWeight: 600 }}>{defaultShipper.name}{defaultShipper.company ? ` — ${defaultShipper.company}` : ''}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
                {defaultShipper.street}{defaultShipper.street2 ? `, ${defaultShipper.street2}` : ''}<br />
                {defaultShipper.city}, {defaultShipper.state} {defaultShipper.zip}
              </div>
              <a href="/address-book" className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
                Edit in Address Book
              </a>
            </div>
          ) : (
            <div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>No default shipper set.</div>
              <a href="/address-book" className="btn btn-ghost btn-sm" style={{ marginTop: 12, display: 'inline-flex' }}>
                Set Default Shipper
              </a>
            </div>
          )}
        </div>

        <div className="section-title">Platform Info</div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total Shipments', value: shipCount ?? 0 },
              { label: 'Address Book', value: `${addrCount ?? 0} contacts` },
              { label: 'User Profile', value: profile?.company || 'Display Logic' },
              { label: 'Auth', value: 'Clerk' },
              { label: 'Database', value: 'Supabase Postgres' },
              { label: 'Hosting', value: 'Vercel' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
