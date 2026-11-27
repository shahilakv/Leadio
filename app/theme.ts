// Light / dark theme. The choice is kept per device in localStorage ('ld_theme') and applied as
// <html data-theme="dark">. THEME_SCRIPT runs in <head> before the page draws, so there's no white flash.
export type Theme = 'light' | 'dark';
export const THEME_KEY = 'ld_theme';
export const THEME_BG: Record<Theme, string> = { light: '#EDEFF2', dark: '#0E0F12' };

export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='dark'){document.documentElement.dataset.theme='dark';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','${THEME_BG.dark}')}}catch(e){}})();`;

export function applyTheme(t: Theme) {
  if (t === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', THEME_BG[t]));
  try { localStorage.setItem(THEME_KEY, t); } catch { /* private mode: theme lasts for this visit */ }
}
