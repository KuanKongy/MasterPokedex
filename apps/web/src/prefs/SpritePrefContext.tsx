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

/** The style a PokeAPI sprite URL belongs to, read back off the URL. */
function styleOf(url: string): SpriteStyle {
  if (url.includes('/other/home/')) return 'home';
  if (url.includes('/other/official-artwork/')) return 'artwork';
  return 'sprite';
}

const STYLE_ORDER: Record<SpriteStyle, SpriteStyle[]> = {
  artwork: ['artwork', 'home', 'sprite'],
  home: ['home', 'artwork', 'sprite'],
  sprite: ['sprite', 'artwork', 'home'],
};

/**
 * Walk every rendition before giving up, then show a Poké Ball rather than the
 * browser's broken-image glyph.
 *
 * PokeAPI's sprite repo is not uniform. Of our 1,351 rows, twelve have no
 * official artwork; four of those (both busted Mimikyu, Mega Curly and Mega
 * Droopy Tatsugiri) do have pixel and HOME art, so simply trying the other
 * sets finds them. The eight Koraidon and Miraidon ride builds have nothing
 * anywhere, because they are gameplay states of one design — passing `baseId`
 * lets them borrow the species' own artwork, which is the honest picture.
 *
 * This used to reassign the artwork URL once and clear the handler, which on
 * the default style re-requested the URL that had just 404'd and then stopped
 * — the broken glyph was the end state.
 */
export function spriteFallback(
  e: React.SyntheticEvent<HTMLImageElement>,
  pokemonId: number,
  baseId?: number,
) {
  const img = e.currentTarget;
  const styles = STYLE_ORDER[styleOf(img.src)];
  const chain = styles.map((style) => pokemonImage(pokemonId, style));
  if (baseId && baseId !== pokemonId) chain.push(...styles.map((style) => pokemonImage(baseId, style)));

  const next = Number(img.dataset.spriteStage ?? '0') + 1;
  img.dataset.spriteStage = String(next);
  if (next < chain.length) {
    img.src = chain[next];
    return;
  }
  img.onerror = null;
  img.classList.add('opacity-40');
  img.title = 'No artwork available for this form yet';
  // The chrome's own ball, matching whichever colourway is on <html>.
  const ball = document.documentElement.dataset.ball ?? 'poke-ball';
  img.src = `${import.meta.env.BASE_URL}logo/${ball}.png`;
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
