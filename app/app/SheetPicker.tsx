'use client';
import { useEffect, useState } from 'react';
import type { Source } from '@/lib/types';

const KEY = 'ld_sheet';
export const sheetName = (s: Source) => s.label && s.tab_title && s.tab_title !== 'Sheet1' ? `${s.label} · ${s.tab_title}` : s.label || s.tab_title || 'Google Sheet';

// Which connected sheet to show ('' = all). Remembered on this device; shared by Leads and Follow-ups.
export function useSheetFilter(sources: Source[]) {
  const [sheet, setSheetState] = useState('');
  useEffect(() => {
    try { const v = localStorage.getItem(KEY) || ''; if (sources.some(s => s.id === v)) setSheetState(v); } catch { /* private mode */ }
  }, [sources]);
  const setSheet = (v: string) => { setSheetState(v); try { localStorage.setItem(KEY, v); } catch { /* private mode */ } };
  return [sheet, setSheet] as const;
}

export default function SheetPicker({ sources, value, onChange, counts }: {
  sources: Source[]; value: string; onChange: (id: string) => void; counts: Record<string, number>;
}) {
  if (sources.length < 2) return null;
  const all = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <label className="sheetpick">
      <span className="lbl">Sheet</span>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label="Choose which sheet’s leads to show">
        <option value="">All sheets ({all})</option>
        {sources.map(s => <option key={s.id} value={s.id}>{sheetName(s)} ({counts[s.id] || 0})</option>)}
      </select>
    </label>
  );
}
