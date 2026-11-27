import { Brand } from '@/app/Icons';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase/server';

export default async function Home() {
  if (await currentUser()) redirect('/app');
  return (
    <main className="col center">
      <div className="card" style={{ width: '100%' }}>
        <Brand />
        <h1>Call every ad lead, on time.</h1>
        <p className="sub">Connect the Google Sheet your Meta ads fill, and your team gets a simple calling list with WhatsApp, follow-ups and stats.</p>
        <Link className="btn" href="/signup">Create a free account</Link>
        <Link className="btn light" href="/login">Log in</Link>
        <nav className="foot"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav>
      </div>
    </main>
  );
}
