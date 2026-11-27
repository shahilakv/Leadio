import Link from 'next/link';

export const metadata = { title: 'Privacy policy · Lead Desk' };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
const UPDATED = '27 November 2026';

export default function Privacy() {
  return (
    <main className="col">
      <article className="card legal">
        <Link className="link" href="/">‹ Lead Desk</Link>
        <h1>Privacy policy</h1>
        <p className="sub">Last updated {UPDATED}</p>

        <p>Lead Desk is a web app by BBB Integrated that helps businesses call and message the leads their ads collect. This policy explains what we store, why, and your choices.</p>

        <h2>What we collect</h2>
        <ul>
          <li><b>Your account:</b> name, email address and a password (stored hashed by our authentication provider, Supabase).</li>
          <li><b>Your company:</b> its name, settings (such as your WhatsApp message) and the people on your team.</li>
          <li><b>Your leads:</b> the columns you choose from the Google Sheet you connect (for example name, phone number, city and form answers), plus the call results, statuses, follow-up dates and notes your team adds.</li>
          <li><b>Basic technical data:</b> sign-in sessions and server logs needed to run and secure the service.</li>
        </ul>

        <h2>Google user data</h2>
        <p>If you use “Connect Google”, we ask for the <code>drive.file</code> permission. It only lets Lead Desk open the spreadsheet you choose in the Google Picker, not the rest of your Drive. We use that access only to read the sheet’s rows and show them to your team as leads. We never write to, share or delete your files.</p>
        <p>Lead Desk’s use and transfer of information received from Google APIs adheres to the <a className="link" href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We don’t use Google user data for advertising, we don’t sell it, and we don’t use it to train AI models. People at BBB Integrated don’t read it unless you ask us to for support, it’s needed for security, or the law requires it.</p>
        <p>The Google access token is stored encrypted. You can remove Lead Desk’s access at any time in your <a className="link" href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a>.</p>

        <h2>How we use data</h2>
        <p>Only to provide Lead Desk: showing leads to the members of your company, saving call results, sending account emails (such as verification and password reset) and keeping the service secure. Each company’s data is kept separate; members of one company can’t see another company’s leads.</p>

        <h2>Where it’s stored and who processes it</h2>
        <p>Data is stored with Supabase (database and authentication) and the app runs on Vercel. Google provides the Sheets and sign-in services. These providers process data on our behalf to run the service.</p>

        <h2>Keeping and deleting data</h2>
        <p>We keep your data while your company uses Lead Desk. Leads removed from your sheet stay in Lead Desk with their call history until you ask us to delete them. To delete your account, your company’s data or a disconnected sheet’s leads, contact us{CONTACT ? <> at <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a></> : ''} and we’ll delete it within 30 days.</p>

        <h2>Your choices</h2>
        <p>You can ask for a copy of your data, correct it, or have it deleted. Company owners decide which sheet is connected and who is on the team.</p>

        <h2>Contact</h2>
        <p>BBB Integrated{CONTACT ? <> · <a className="link" href={`mailto:${CONTACT}`}>{CONTACT}</a></> : ''}</p>
      </article>
    </main>
  );
}
