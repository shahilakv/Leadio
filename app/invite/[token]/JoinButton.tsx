'use client';
import { useState, useTransition } from 'react';
import { acceptInvite } from './actions';

export default function JoinButton({ token, company }: { token: string; company: string }) {
  const [err, setErr] = useState('');
  const [pending, start] = useTransition();
  return (
    <>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await acceptInvite(token); if (r?.error) setErr(r.error); })}>
        {pending ? 'Joining…' : `Join ${company}`}
      </button>
    </>
  );
}
