'use client';
import { useActionState } from 'react';
import type { FormState } from './actions';

type Field = { name: string; label: string; type?: string; autoComplete?: string; defaultValue?: string; hidden?: boolean };

// One small form component for every auth screen: fields, a submit button, and the error/success line.
export default function AuthForm({ action, fields, submit }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  fields: Field[];
  submit: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {fields.map(f => f.hidden
        ? <input key={f.name} type="hidden" name={f.name} value={f.defaultValue ?? ''} />
        : (
          <label key={f.name} className="field">
            <span className="lbl">{f.label}</span>
            <input name={f.name} type={f.type ?? 'text'} autoComplete={f.autoComplete} defaultValue={f.defaultValue} required />
          </label>
        ))}
      {state?.error && <p className="err" role="alert">{state.error}</p>}
      {state?.ok && <p className="ok" role="status">{state.ok}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Please wait…' : submit}</button>
    </form>
  );
}
