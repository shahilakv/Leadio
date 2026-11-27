'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { waText } from '@/lib/leads';
import { updateCompany } from '../actions';

export default function CompanyForm({ name, template, countryCode, owner }: { name: string; template: string; countryCode: string; owner: boolean }) {
  const router = useRouter();
  const [v, setV] = useState({ name, whatsapp_template: template, country_code: countryCode });
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV(x => ({ ...x, [k]: e.target.value }));
  const save = () => start(async () => {
    const r = await updateCompany(v);
    setMsg(r.ok ? { ok: 'Saved' } : { error: r.error });
    if (r.ok) router.refresh();
  });

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <label className="field"><span className="lbl">Company name</span><input value={v.name} onChange={set('name')} disabled={!owner} maxLength={120} /></label>
      <label className="field">
        <span className="lbl">WhatsApp message</span>
        <textarea className="input" value={v.whatsapp_template} onChange={set('whatsapp_template')} disabled={!owner} maxLength={1000} />
      </label>
      <p className="sub">Use <b>{'{name}'}</b> for the lead’s first name, <b>{'{type}'}</b> for what they’re looking for and <b>{'{city}'}</b> for their city.</p>
      <div className="ok" style={{ background: 'var(--soft)', color: 'var(--ink)', fontWeight: 500 }}>
        <span className="lbl" style={{ marginBottom: 2 }}>Preview</span>
        {waText(v.whatsapp_template, { name: 'Abida Najeeb', type: 'furnished', city: 'Calicut' })}
      </div>
      <label className="field">
        <span className="lbl">Country code for numbers without one</span>
        <input value={v.country_code} onChange={set('country_code')} disabled={!owner} inputMode="numeric" maxLength={4} placeholder="91" />
      </label>
      {msg.error && <p className="err" role="alert">{msg.error}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
      {owner ? <button className="btn" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save company settings'}</button>
        : <p className="sub">Only the owner can change these.</p>}
    </div>
  );
}
