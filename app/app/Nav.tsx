'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app', label: 'Leads' },
  { href: '/app/follow-ups', label: 'Follow-ups' },
  { href: '/app/stats', label: 'Stats' },
  { href: '/app/settings', label: 'Settings' },
];

export default function Nav({ due }: { due: number }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Main">
      {TABS.map(t => {
        const on = path === t.href;
        return (
          <Link key={t.href} href={t.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <span>{t.label}{t.href === '/app/follow-ups' && due > 0 && <span className="navbadge" aria-label={`${due} due`}>{due}</span>}</span>
          </Link>
        );
      })}
    </nav>
  );
}
