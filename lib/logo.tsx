// The Leadio mark, drawn once and used for the favicon fallback, home-screen icons and the in-app brand.
// Yellow rounded square, dark outline phone, and a dot for "a new lead just came in".
// Keep app/icon.svg in step with this drawing.
export const LOGO_YELLOW = '#FFD43B';
export const LOGO_INK = '#111114';
const PHONE = 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z';

/**
 * size: pixel size. rounded: false for full-bleed icons (iOS and Android round the corners themselves).
 * pad: extra inner margin (0..1) for Android "maskable" icons, whose edges get cropped.
 */
export function LogoMark({ size, rounded = true, pad = 0 }: { size: number; rounded?: boolean; pad?: number }) {
  const s = 1.45 * (1 - pad), t = 32 - 32 * (1 - pad);   // shrink the drawing toward the centre
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 64 64">
      <rect width="64" height="64" rx={rounded ? 15 : 0} fill={LOGO_YELLOW} />
      <g transform={`translate(${t + 13.5 * (1 - pad)} ${t + 14.5 * (1 - pad)}) scale(${s})`} fill="none" stroke={LOGO_INK} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
        <path d={PHONE} />
      </g>
      <circle cx={t + 45.5 * (1 - pad)} cy={t + 18.5 * (1 - pad)} r={5.2 * (1 - pad)} fill={LOGO_INK} />
    </svg>
  );
}
