import { useCallback, useEffect, useState } from 'react';

/**
 * Per-page column visibility, persisted per device. Every data page keeps
 * its own key under `masterpokedex.columns.<pageKey>`; unknown keys from an
 * older build are dropped on read so renames never wedge a page.
 */
export function useColumnPrefs(pageKey: string, allKeys: readonly string[], defaults: readonly string[]) {
  const storageKey = `masterpokedex.columns.${pageKey}`;
  const [visible, setVisible] = useState<string[]>([...defaults]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setVisible(parsed.filter((k): k is string => typeof k === 'string' && allKeys.includes(k)));
        }
      }
    } catch {
      // stay on defaults
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const toggle = useCallback(
    (key: string, on: boolean) => {
      setVisible((current) => {
        // Re-derive from allKeys so column order stays canonical.
        const next = allKeys.filter((k) => (k === key ? on : current.includes(k)));
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // preference just won't stick
        }
        return next;
      });
    },
    [allKeys, storageKey],
  );

  return { visible, toggle };
}
