import type { BallStyle } from './BallPrefContext';

/**
 * Companion data for the Poké Ball site themes. Keep in sync with the
 * [data-ball=…] blocks in src/index.css — these hexes exist because CSS
 * variables can't reach the theme-color meta tag or inline swatch dots.
 *
 * Each ball's dots are its honest colour list, flat and unshadowed: the main
 * colour first (what the header and footer wear), then the accent marking,
 * then a band-text or extra colour only where the ball really has one — so
 * the Poké Ball shows a single red while Beast and Luxury show four. Counts
 * vary on purpose; the Settings grid just maps whatever is here.
 */

/** The ball's colour dots for the Settings preview, per resolved theme. */
export const BALL_SWATCHES: Record<BallStyle, { light: string[]; dark: string[] }> = {
  'poke-ball': { light: ['#E3350D'], dark: ['#F45D2F'] },
  'great-ball': { light: ['#1561A8', '#CE342C'], dark: ['#1B4E7E', '#EC5B51'] },
  'ultra-ball': { light: ['#17171C', '#F7CC22'], dark: ['#19191F', '#F8D23A'] },
  'master-ball': { light: ['#6B47BD', '#C63978'], dark: ['#553B91', '#E56CA2'] },
  'beast-ball': { light: ['#2844A9', '#4B328F', '#EEBE11', '#3BB8CE'], dark: ['#263A82', '#3E2B73', '#F1C937', '#6DD6E8'] },
  'quick-ball': { light: ['#197BA9', '#FFD91A'], dark: ['#196A8F', '#FFDF3D'] },
  'dusk-ball': { light: ['#45A148', '#E0661F', '#1B231A'], dark: ['#326734', '#F08242', '#D8E0D7'] },
  'timer-ball': { light: ['#F3F3F7', '#C22B24', '#272625'], dark: ['#2A2928', '#F7776E', '#F3F3F7'] },
  'luxury-ball': { light: ['#1A171C', '#C8A328', '#C7CBD1', '#C7293E'], dark: ['#141216', '#E1BD47', '#CCD0D7', '#E4586B'] },
  'net-ball': { light: ['#0FA4A9', '#343841'], dark: ['#146E71', '#949BA8'] },
};

/** Light-mode header band per ball, for <meta name="theme-color">. */
export const BALL_THEME_COLOR = Object.fromEntries(
  (Object.keys(BALL_SWATCHES) as BallStyle[]).map((ball) => [ball, BALL_SWATCHES[ball].light[0]]),
) as Record<BallStyle, string>;
