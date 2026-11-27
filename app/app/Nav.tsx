'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app', label: 'Leads' },
  { href: '/app/follow-ups', label: 'Follow-ups' },
  { href: '/app/stats', label: 'Stats' },
  { href: '/app/settings', label: 'Settings' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map(t => (
        <Link key={t.href} href={t.href} className={path === t.href ? 'on' : ''} aria-current={path === t.href ? 'page' : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
