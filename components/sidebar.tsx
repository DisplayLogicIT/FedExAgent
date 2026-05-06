'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

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

  useEffect(() => {
    const stored = localStorage.getItem('fedex_env');
    if (stored === 'production' || stored === 'sandbox') setEnv(stored);
  }, []);

  function toggleEnv(e: 'sandbox' | 'production') {
    setEnv(e);
    localStorage.setItem('fedex_env', e);
    window.dispatchEvent(new CustomEvent('envchange', { detail: e }));
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
          <button className={env === 'production' ? 'on' : ''} onClick={() => toggleEnv('production')}>Production</button>
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
    </aside>
  );
}
