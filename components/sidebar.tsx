'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

const NAV = [
  { href: '/', label: 'Home', icon: '⊞' },
  { href: '/agents', label: 'Agents', icon: '◈' },
];
const NAV2 = [
  { href: '/fedex', label: 'FedEx Labels', icon: '📦' },
  { href: '/address-book', label: 'Address Book', icon: '◎' },
  { href: '/history', label: 'History', icon: '◷' },
  { href: '/analytics', label: 'Analytics', icon: '◈' },
];
const NAV3 = [
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [env, setEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [labelFormat, setLabelFormat] = useState<'thermal' | 'laser'>('thermal');

  useEffect(() => {
    const storedEnv = localStorage.getItem('fedex_env');
    if (storedEnv === 'production' || storedEnv === 'sandbox') setEnv(storedEnv);
    const storedFormat = localStorage.getItem('fedex_label_format');
    if (storedFormat === 'thermal' || storedFormat === 'laser') setLabelFormat(storedFormat);
  }, []);

  function toggleEnv(e: 'sandbox' | 'production') {
    setEnv(e);
    localStorage.setItem('fedex_env', e);
    window.dispatchEvent(new CustomEvent('envchange', { detail: e }));
  }

  function toggleLabelFormat(f: 'thermal' | 'laser') {
    setLabelFormat(f);
    localStorage.setItem('fedex_label_format', f);
    window.dispatchEvent(new CustomEvent('labelformatchange', { detail: f }));
  }

  const firstName = user?.firstName || 'User';
  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '');

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">{initials || 'DL'}</div>
        <div>
          <div className="brand-name">{firstName} Dashboard</div>
          <div className="brand-sub">Operations</div>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-label">Overview</div>
        {NAV.map(n => (
          <Link key={n.href} href={n.href} className={`nav-link${pathname === n.href ? ' active' : ''}`}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-label">Tools</div>
        {NAV2.map(n => (
          <Link key={n.href} href={n.href} className={`nav-link${pathname === n.href ? ' active' : ''}`}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <nav className="nav-section">
        <div className="nav-label">System</div>
        {NAV3.map(n => (
          <Link key={n.href} href={n.href} className={`nav-link${pathname === n.href ? ' active' : ''}`}>
            <span style={{ fontSize: 14 }}>{n.icon}</span>
            {n.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div style={{ padding: '0 2px' }}>
        <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Environment</div>
        <div className="env-pill">
          <button className={env === 'sandbox' ? 'on' : ''} onClick={() => toggleEnv('sandbox')}>Sandbox</button>
          <button className={env === 'production' ? 'on' : ''} onClick={() => toggleEnv('production')} title="Pending FedEx label validation">Production</button>
        </div>
        {env === 'production' && (
          <div style={{ fontSize: 10, color: 'var(--warn)', marginTop: 6, lineHeight: 1.3 }}>
            ⚠ Pending FedEx Bar Code Analysis approval
          </div>
        )}
      </div>

      <div style={{ padding: '12px 2px 0' }}>
        <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Label Format</div>
        <div className="env-pill">
          <button className={labelFormat === 'thermal' ? 'on' : ''} onClick={() => toggleLabelFormat('thermal')} title="ZPL II — Zebra thermal printers">🖨 Thermal</button>
          <button className={labelFormat === 'laser' ? 'on' : ''} onClick={() => toggleLabelFormat('laser')} title="PNG — laser printers">🖨 Laser</button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 6, lineHeight: 1.3 }}>
          {labelFormat === 'thermal' ? 'ZPL II · Zebra / thermal' : 'PNG · Laser / inkjet'}
        </div>
      </div>

      <div className="user-chip">
        <UserButton />
        <div style={{ minWidth: 0 }}>
          <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.fullName || 'User'}
          </div>
          <div className="user-email" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.emailAddresses?.[0]?.emailAddress || ''}
          </div>
        </div>
      </div>

      <div style={{ padding: '8px 4px 0', fontSize: 10, color: 'var(--muted2)', textAlign: 'center', letterSpacing: '0.4px' }}>
        v{APP_VERSION}
      </div>
    </aside>
  );
}
