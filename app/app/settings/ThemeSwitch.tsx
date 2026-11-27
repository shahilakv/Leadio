'use client';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from '@/app/Icons';
import { applyTheme, type Theme } from '@/app/theme';

// Light / Dark switch with icons. Saved on this device.
export default function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'); }, []);
  const pick = (t: Theme) => { setTheme(t); applyTheme(t); };
  return (
    <div className="card" style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <div><b>Appearance</b><p className="sub">Saved on this phone</p></div>
      <div className="themesw" role="radiogroup" aria-label="Appearance">
        <span className="themepill" style={{ transform: theme === 'dark' ? 'translateX(100%)' : 'none' }} aria-hidden />
        <button role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'on' : ''} onClick={() => pick('light')}>
          <SunIcon size={18} /><span>Light</span>
        </button>
        <button role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'on' : ''} onClick={() => pick('dark')}>
          <MoonIcon size={18} /><span>Dark</span>
        </button>
      </div>
    </div>
  );
}
