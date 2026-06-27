import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { BALL_THEME_COLOR } from './ballTheme';

/**
 * Which Poké Ball the app uses for its own chrome — the loading spinner and
 * the catch affordances. Pure cosmetics, per device, so it lives in
 * localStorage next to the sprite-style preference.
 */
export type BallStyle =
  | 'poke-ball'
  | 'great-ball'
  | 'ultra-ball'
  | 'master-ball'
  | 'beast-ball'
  | 'luxury-ball'
  | 'quick-ball'
  | 'dusk-ball'
  | 'timer-ball'
  | 'net-ball';

export const BALL_STYLES: Array<{ value: BallStyle; label: string }> = [
  { value: 'poke-ball', label: 'Poké Ball' },
  { value: 'great-ball', label: 'Great Ball' },
  { value: 'ultra-ball', label: 'Ultra Ball' },
  { value: 'master-ball', label: 'Master Ball' },
  { value: 'beast-ball', label: 'Beast Ball' },
  { value: 'luxury-ball', label: 'Luxury Ball' },
  { value: 'quick-ball', label: 'Quick Ball' },
  { value: 'dusk-ball', label: 'Dusk Ball' },
  { value: 'timer-ball', label: 'Timer Ball' },
  { value: 'net-ball', label: 'Net Ball' },
];

const BALL_VALUES = new Set<string>(BALL_STYLES.map((b) => b.value));
const STORAGE_KEY = 'masterpokedex.ballStyle';
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';

/** The same item-sprite scheme the dex's generated `items.sprite` column uses. */
export function ballSprite(style: BallStyle): string {
  return `${SPRITE_BASE}/items/${style}.png`;
}

type BallPrefState = {
  ballStyle: BallStyle;
  setBallStyle: (style: BallStyle) => void;
};

const BallPrefContext = createContext<BallPrefState | undefined>(undefined);

function readStored(): BallStyle {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && BALL_VALUES.has(raw)) return raw as BallStyle;
  } catch {
    // Private windows can throw; the default is fine.
  }
  return 'poke-ball';
}

export const BallPrefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ballStyle, setBallStyleState] = useState<BallStyle>('poke-ball');

  useEffect(() => {
    setBallStyleState(readStored());
  }, []);

  // The ball themes the whole site: index.css keys its palettes off this
  // attribute, and the browser chrome color follows the light header band.
  // (index.html mirrors localStorage before hydration to avoid a flash.)
  useEffect(() => {
    document.documentElement.dataset.ball = ballStyle;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BALL_THEME_COLOR[ballStyle]);
  }, [ballStyle]);

  const setBallStyle = useCallback((style: BallStyle) => {
    setBallStyleState(style);
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
      // Preference just won't survive a reload.
    }
  }, []);

  return <BallPrefContext.Provider value={{ ballStyle, setBallStyle }}>{children}</BallPrefContext.Provider>;
};

export function useBallPref(): BallPrefState {
  const ctx = useContext(BallPrefContext);
  if (!ctx) throw new Error('useBallPref must be used inside <BallPrefProvider>');
  return ctx;
}
