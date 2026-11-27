'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/app', label: 'Leads' },
  { href: '/app/follow-ups', label: 'Follow-ups' },
  { href: '/app/stats', label: 'Stats' },
  { href: '/app/settings', label: 'Settings' },
];
const indexFor = (path: string) => Math.max(0, TABS.findIndex(t => t.href === path || (t.href !== '/app' && path.startsWith(t.href + '/'))));

// The yellow pill slides to the tapped tab immediately, before the next screen has loaded.
export default function Nav({ due }: { due: number }) {
  const path = usePathname();
  const [active, setActive] = useState(() => indexFor(path));
  useEffect(() => setActive(indexFor(path)), [path]);
  return (
    <nav className="nav" aria-label="Main">
      <span className="navpill" style={{ transform: `translateX(${active * 100}%)` }} aria-hidden />
      {TABS.map((t, i) => (
        <Link key={t.href} href={t.href} prefetch className={active === i ? 'on' : ''} aria-current={active === i ? 'page' : undefined} onClick={() => setActive(i)}>
          <span>{t.label}{t.href === '/app/follow-ups' && due > 0 && <span className="navbadge" aria-label={`${due} due`}>{due}</span>}</span>
        </Link>
      ))}
    </nav>
  );
}
