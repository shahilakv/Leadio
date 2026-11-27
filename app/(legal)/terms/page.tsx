import Link from 'next/link';

export const metadata = { title: 'Terms of service · Leadio' };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';

export default function Terms() {
  return (
    <main className="col">
      <article className="card legal">
        <Link className="link" href="/">‹ Leadio</Link>
        <h1>Terms of service</h1>
        <p className="sub">Last updated 27 November 2026</p>

        <p>These terms cover your use of Leadio, a service by BBB Integrated. By creating an account you agree to them.</p>

        <h2>Your account and team</h2>
        <p>Keep your password safe and use an email address you control. Company owners are responsible for who they invite and for removing people who should no longer have access.</p>

        <h2>Your data</h2>
        <p>You own the leads and notes you put into Leadio. You confirm you have the right to use the data in the sheets you connect, including contacting the people in them, and that you follow the laws that apply to you (for example on consent, calling hours and messaging). Our <Link className="link" href="/privacy">privacy policy</Link> explains how we handle data.</p>

        <h2>Acceptable use</h2>
        <p>Don’t use Leadio to send spam, harass people, break the law, or try to access other companies’ data or our systems without permission.</p>

        <h2>The service</h2>
        <p>We work to keep Leadio available and your data safe, but the service is provided “as is”. We may change or improve features. If we ever stop the service, we’ll give reasonable notice so you can export your data.</p>

        <h2>Ending</h2>
        <p>You can stop using Leadio at any time and ask us to delete your data. We may suspend accounts that break these terms.</p>

        <h2>Contact</h2>
        <p>BBB Integrated{CONTACT ? <> · <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a></> : ''}</p>
      </article>
    </main>
  );
}
