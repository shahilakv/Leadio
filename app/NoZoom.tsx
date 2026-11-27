'use client';
import { useEffect } from 'react';

// iPhone Safari ignores "user-scalable=no" in the viewport tag. Cancelling its pinch gesture events
// (and two-finger drags) keeps Leadio at a fixed size, like a native app. Double-tap zoom is already
// off through touch-action: manipulation in globals.css.
export default function NoZoom() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    const twoFingers = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener('gesturestart', stop, { passive: false });
    document.addEventListener('gesturechange', stop, { passive: false });
    document.addEventListener('gestureend', stop, { passive: false });
    document.addEventListener('touchmove', twoFingers, { passive: false });
    return () => {
      document.removeEventListener('gesturestart', stop);
      document.removeEventListener('gesturechange', stop);
      document.removeEventListener('gestureend', stop);
      document.removeEventListener('touchmove', twoFingers);
    };
  }, []);
  return null;
}
