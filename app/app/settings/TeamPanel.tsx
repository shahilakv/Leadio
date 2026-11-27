'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInvite, cancelInvite, removeMember } from './teamActions';
import type { Member, Invite } from '@/lib/team';

const inviteText = (company: string, url: string) =>
  `You're invited to join ${company} on Lead Desk to call our leads. Open this link to join: ${url}`;

export default function TeamPanel({ members, invites, me, owner, company, site }: {
  members: Member[]; invites: Invite[]; me: string; owner: boolean; company: string; site: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'caller' | 'owner'>('caller');
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({});
  const [made, setMade] = useState<{ email: string; url: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [pending, start] = useTransition();

  const copy = async (url: string) => { try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(''), 2000); } catch { /* select manually */ } };
  const invite = () => start(async () => {
    setMsg({});
    const r = await createInvite(email, role);
    if (!r.ok) return setMsg({ error: r.error });
    setMade({ email: email.trim().toLowerCase(), url: r.url }); setEmail(''); router.refresh();
  });
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) => start(async () => {
    const r = await fn(); setMsg(r.ok ? { ok } : { error: r.error }); if (r.ok) router.refresh();
  });

  const share = (to: string, url: string) => (
    <div className="acts" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
      <button className="act" style={{ background: 'var(--soft)' }} onClick={() => copy(url)}>{copied === url ? 'Copied ✓' : 'Copy link'}</button>
      <a className="act wa" href={`https://wa.me/?text=${encodeURIComponent(inviteText(company, url))}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className="act call" href={`mailto:${to}?subject=${encodeURIComponent(`Join ${company} on Lead Desk`)}&body=${encodeURIComponent(inviteText(company, url))}`}>Email</a>
    </div>
  );

  return (
    <div className="card" style={{ marginTop: 10 }}>
      <span className="lbl" style={{ margin: 0 }}>Team · {members.length}</span>
      {members.map(m => (
        <div key={m.user_id} className="row" style={{ color: 'var(--ink)' }}>
          <div style={{ flex: 1 }}>
            <b>{m.name}{m.user_id === me ? ' (you)' : ''}</b>
            <p className="sub">{m.email} · {m.role === 'owner' ? 'Owner' : 'Caller'}</p>
          </div>
          {owner && m.user_id !== me && (
            <button className="pill" style={{ background: 'var(--soft)' }} disabled={pending}
              onClick={() => run(() => removeMember(m.user_id), `${m.name} removed`)}>Remove</button>
          )}
        </div>
      ))}

      {owner && (
        <>
          <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
          <b>Invite someone</b>
          <p className="sub">They’ll get a link to join. Callers can call leads and update statuses. Owners can also connect sheets, change settings and manage the team.</p>
          <label className="field"><span className="lbl">Their email</span>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
          </label>
          <label className="field"><span className="lbl">Role</span>
            <select value={role} onChange={e => setRole(e.target.value as 'caller' | 'owner')}>
              <option value="caller">Caller</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <button className="btn" onClick={invite} disabled={pending || !email.trim()}>{pending ? 'Creating…' : 'Create invite link'}</button>

          {made && (
            <div className="ok" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span>Invite ready for <b>{made.email}</b>. Send them the link:</span>
              {share(made.email, made.url)}
            </div>
          )}

          {invites.length > 0 && (
            <>
              <span className="lbl" style={{ margin: '6px 0 0' }}>Waiting to join</span>
              {invites.map(i => {
                const url = `${site}/invite/${i.token}`;
                return (
                  <div key={i.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 0', borderTop: '1px solid var(--line)' }}>
                    <div className="row" style={{ color: 'var(--ink)' }}>
                      <div><b>{i.email}</b><p className="sub">{i.role === 'owner' ? 'Owner' : 'Caller'} · link works until {new Date(i.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>
                      <button className="pill" style={{ background: 'var(--soft)' }} disabled={pending} onClick={() => run(() => cancelInvite(i.id), 'Invite cancelled')}>Cancel</button>
                    </div>
                    {share(i.email, url)}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
      {msg.error && <p className="err" role="alert">{msg.error}</p>}
      {msg.ok && <p className="ok" role="status">{msg.ok}</p>}
    </div>
  );
}
