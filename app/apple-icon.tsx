import { ImageResponse } from 'next/og';
import { LogoMark } from '@/lib/logo';

// iPhone "Add to Home Screen" icon (PNG, 180×180, square: iOS rounds the corners itself).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(<LogoMark size={180} rounded={false} />, size);
}
