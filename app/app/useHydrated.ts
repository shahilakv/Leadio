'use client';
import { useSyncExternalStore } from 'react';

// false while rendering on the server (and during hydration), true in the browser afterwards.
// Use it for anything that depends on the phone's clock or time zone ("4:43 pm", "2h ago"):
// Vercel renders in UTC, so drawing those on the server would mismatch the phone's India time.
const noop = () => () => {};
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false);
