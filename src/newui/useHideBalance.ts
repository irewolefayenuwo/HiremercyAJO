import { useCallback, useEffect, useState } from 'react';

const KEY = 'hm_hide_balance';
const EVT = 'hm-hide-balance';

const read = (): boolean => {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
};

/**
 * The eye icon on the Home and Wallet cards. One shared setting, remembered on this phone only
 * (no database). Works even when browser storage is blocked: it then lasts until the page is closed.
 */
let memory: boolean | null = null;
export function useHideBalance() {
  const [hidden, setHidden] = useState<boolean>(() => (memory !== null ? memory : read()));
  useEffect(() => {
    const sync = () => setHidden(memory !== null ? memory : read());
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const toggle = useCallback(() => {
    const next = !(memory !== null ? memory : read());
    memory = next;
    try { localStorage.setItem(KEY, next ? '1' : '0'); } catch { /* storage blocked: memory keeps it */ }
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { hidden, toggle };
}

/** Shown in place of an amount while hidden. */
export const MASK = '••••••';
