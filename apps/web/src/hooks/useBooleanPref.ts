import { useCallback, useEffect, useState } from 'react';

/**
 * A device-level on/off switch, persisted in localStorage.
 *
 * Deliberately a hook rather than another context: these are one-line opt-ins
 * read by a page or two, and a provider per flag would cost more than it buys.
 * The value starts at its default and hydrates in an effect, matching
 * `SpritePrefContext` — a synchronous read would disagree with the first paint
 * in any environment where storage is unavailable.
 */
export function useBooleanPref(key: string, defaultValue = false) {
  const storageKey = `masterpokedex.${key}`;
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw === 'true' || raw === 'false') setValue(raw === 'true');
    } catch {
      // Private windows throw; the default is fine.
    }
  }, [storageKey]);

  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, String(next));
      } catch {
        // Preference just won't survive a reload.
      }
    },
    [storageKey],
  );

  return [value, set] as const;
}

/**
 * "Always show alternate forms": seeds the evolution chain's Megas and
 * Gigantamax switches and opens the Forms section on arrival, for people who
 * care about the whole family rather than the base forms.
 */
export const ALWAYS_SHOW_MEGAS = 'alwaysShowMegas';
