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
 * Whose art draws the ball: the game's bag icons as PokeAPI serves them, or
 * the site's own pixel logos on either grid. Fine, the 64-grid drawing, is
 * the default. The order pairs with SPRITE_STYLES in Settings: the games'
 * own pixels, then the flat drawing, then the high-fidelity take.
 */
export type BallArt = 'drawn' | 'fine' | 'original';

export const BALL_ARTS: Array<{ value: BallArt; label: string; description: string }> = [
  { value: 'original', label: 'Game', description: "The games' own bag icons, via PokeAPI" },
  { value: 'drawn', label: 'Pixel', description: 'Our logo on a 32×32 grid — chunky, whole-cell pixels' },
  { value: 'fine', label: 'Fine', description: 'The same drawing on a 64×64 grid — four times the pixels, finer steps (default)' },
];

const BALL_VALUES = new Set<string>(BALL_STYLES.map((b) => b.value));
const ART_VALUES = new Set<string>(BALL_ARTS.map((a) => a.value));
const STORAGE_KEY = 'masterpokedex.ballStyle';
const ART_STORAGE_KEY = 'masterpokedex.ballArt';

const ART_PATH: Record<BallArt, string> = { drawn: '', fine: 'fine/', original: 'original/' };

/**
 * All three kinds are self-hosted in public/logo and made by
 * `scripts/generate-brand-assets.mjs`. The drawn logos share the favicon's grid
 * and palettes, with each ball's markings traced from the games' models, and a
 * margin round the ball for the fins, caps, blades and rims that stand proud of it.
 * The fine ones — the default — are the same balls on a 64 grid, which lets
 * the outline stop stepping and the measured markings land on four times as
 * many cells. The originals are the bag icons cut square around the ball and
 * scaled by whole pixels, so all three sit the same in a box; hotlinking those
 * instead would mean a 30px sprite fetched from GitHub on every page.
 */
export function ballSprite(style: BallStyle, art: BallArt = 'fine'): string {
  return resolveAsset(`logo/${ART_PATH[art]}${style}.png`);
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
    const raw = window.localStorage.getItem(ART_STORAGE_KEY);
    if (raw && ART_VALUES.has(raw)) return raw as BallArt;
  } catch {
    // Private windows can throw; the default is fine.
  }
  return 'fine';
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
  const [ballArt, setBallArtState] = useState<BallArt>('fine');

  useEffect(() => {
    setBallStyleState(readStored());
    setBallArtState(readStoredArt());
  }, []);

  // The ball themes the whole site: index.css keys its palettes off this
  // attribute, and the browser chrome color follows the light header band.
  // (index.html mirrors localStorage before hydration to avoid a flash.)
  useEffect(() => {
    document.documentElement.dataset.ball = ballStyle;
    // The art rides along so non-React code (the sprite fallback) can read it.
    document.documentElement.dataset.ballArt = ballArt;
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
