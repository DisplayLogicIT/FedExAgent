'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
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

  useEffect(() => {
    localStorage.setItem('fedex_env', 'production');
  }, []);

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
