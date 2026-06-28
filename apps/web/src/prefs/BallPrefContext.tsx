import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { resolveAsset } from '@/lib/assets';
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

/**
 * Whose art draws the ball: the site's own pixel logos, or the game's bag
 * icons as PokeAPI and PokémonDB serve them.
 */
export type BallArt = 'drawn' | 'original';

const BALL_VALUES = new Set<string>(BALL_STYLES.map((b) => b.value));
const STORAGE_KEY = 'masterpokedex.ballStyle';
const ART_STORAGE_KEY = 'masterpokedex.ballArt';

/**
 * Both kinds are self-hosted in public/logo and made by
 * `scripts/generate-brand-assets.mjs`. The drawn logos share the favicon's grid
 * and palettes, with each ball's markings traced from the games' models, and a
 * margin round the ball for the fins, domes and blades that stand proud of it.
 * The originals are the bag icons cut square around the ball and scaled by
 * whole pixels, so both sit the same in a box; hotlinking them instead would
 * mean a 30px sprite fetched from GitHub on every page.
 */
export function ballSprite(style: BallStyle, art: BallArt = 'drawn'): string {
  return resolveAsset(art === 'original' ? `logo/original/${style}.png` : `logo/${style}.png`);
}

type BallPrefState = {
  ballStyle: BallStyle;
  setBallStyle: (style: BallStyle) => void;
  ballArt: BallArt;
  setBallArt: (art: BallArt) => void;
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

function readStoredArt(): BallArt {
  try {
    if (window.localStorage.getItem(ART_STORAGE_KEY) === 'original') return 'original';
  } catch {
    // Private windows can throw; the default is fine.
  }
  return 'drawn';
}

function store(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preference just won't survive a reload.
  }
}

export const BallPrefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ballStyle, setBallStyleState] = useState<BallStyle>('poke-ball');
  const [ballArt, setBallArtState] = useState<BallArt>('drawn');

  useEffect(() => {
    setBallStyleState(readStored());
    setBallArtState(readStoredArt());
  }, []);

  // The ball themes the whole site: index.css keys its palettes off this
  // attribute, and the browser chrome color follows the light header band.
  // (index.html mirrors localStorage before hydration to avoid a flash.)
  useEffect(() => {
    document.documentElement.dataset.ball = ballStyle;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BALL_THEME_COLOR[ballStyle]);
    // The tab icon follows too. index.html's <link>s point at the
    // fingerprinted default set; this swaps them for the chosen ball's logo,
    // which lives in public/ precisely so it has a stable, unhashed URL.
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/png"]');
    if (icon) icon.href = ballSprite(ballStyle, ballArt);
  }, [ballStyle, ballArt]);

  const setBallStyle = useCallback((style: BallStyle) => {
    setBallStyleState(style);
    store(STORAGE_KEY, style);
  }, []);

  const setBallArt = useCallback((art: BallArt) => {
    setBallArtState(art);
    store(ART_STORAGE_KEY, art);
  }, []);

  return (
    <BallPrefContext.Provider value={{ ballStyle, setBallStyle, ballArt, setBallArt }}>{children}</BallPrefContext.Provider>
  );
};

export function useBallPref(): BallPrefState {
  const ctx = useContext(BallPrefContext);
  if (!ctx) throw new Error('useBallPref must be used inside <BallPrefProvider>');
  return ctx;
}
