import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

/**
 * Which rendition of a Pokémon the app shows everywhere an image appears:
 * classic pixel sprites, the official artwork, or the HOME 3D renders. A
 * per-device preference, so it lives in localStorage rather than the account.
 */
export type SpriteStyle = 'artwork' | 'sprite' | 'home';

export const SPRITE_STYLES: Array<{ value: SpriteStyle; label: string; description: string }> = [
  { value: 'artwork', label: 'Official artwork', description: 'High-resolution illustrations (default)' },
  { value: 'sprite', label: 'Pixel sprite', description: 'Classic game sprites, crisp and nostalgic' },
  { value: 'home', label: 'HOME render', description: '3D model renders from Pokémon HOME' },
];

const STORAGE_KEY = 'masterpokedex.spriteStyle';
const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';

/** Same URL scheme the dex's generated `sprite`/`artwork` columns use. */
export function pokemonImage(pokemonId: number, style: SpriteStyle): string {
  switch (style) {
    case 'sprite':
      return `${SPRITE_BASE}/pokemon/${pokemonId}.png`;
    case 'home':
      return `${SPRITE_BASE}/pokemon/other/home/${pokemonId}.png`;
    default:
      return `${SPRITE_BASE}/pokemon/other/official-artwork/${pokemonId}.png`;
  }
}

/** Not every form exists in every set; fall back pixel → artwork on 404. */
export function spriteFallback(e: React.SyntheticEvent<HTMLImageElement>, pokemonId: number) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = pokemonImage(pokemonId, 'artwork');
}

type SpritePrefState = {
  spriteStyle: SpriteStyle;
  setSpriteStyle: (style: SpriteStyle) => void;
};

const SpritePrefContext = createContext<SpritePrefState | undefined>(undefined);

function readStored(): SpriteStyle {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'sprite' || raw === 'home' || raw === 'artwork') return raw;
  } catch {
    // Private windows can throw; the default is fine.
  }
  return 'artwork';
}

export const SpritePrefProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [spriteStyle, setSpriteStyleState] = useState<SpriteStyle>('artwork');

  useEffect(() => {
    setSpriteStyleState(readStored());
  }, []);

  const setSpriteStyle = useCallback((style: SpriteStyle) => {
    setSpriteStyleState(style);
    try {
      window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
      // Preference just won't survive a reload.
    }
  }, []);

  return (
    <SpritePrefContext.Provider value={{ spriteStyle, setSpriteStyle }}>
      {children}
    </SpritePrefContext.Provider>
  );
};

export function useSpritePref(): SpritePrefState {
  const ctx = useContext(SpritePrefContext);
  if (!ctx) throw new Error('useSpritePref must be used inside <SpritePrefProvider>');
  return ctx;
}
