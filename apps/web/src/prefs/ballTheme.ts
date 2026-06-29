import type { BallStyle } from './BallPrefContext';

/**
 * Companion data for the Poké Ball site themes. Keep in sync with the
 * [data-ball=…] blocks in src/index.css — these hexes exist because CSS
 * variables can't reach the theme-color meta tag or inline swatch dots.
 */

/** Light-mode header band per ball, for <meta name="theme-color">. */
export const BALL_THEME_COLOR: Record<BallStyle, string> = {
  'poke-ball': '#E3350D',
  'great-ball': '#2170C4',
  'ultra-ball': '#2A2A2F',
  'master-ball': '#6A3CA8',
  'beast-ball': '#2B3DA3',
  'luxury-ball': '#1E1E20',
  'quick-ball': '#2A5BBE',
  'dusk-ball': '#1B2A1F',
  'timer-ball': '#F2F2F5',
  'net-ball': '#0E8290',
};

/** [band, footer, accent] dots for the Settings preview, per resolved theme. */
export const BALL_SWATCHES: Record<BallStyle, { light: [string, string, string]; dark: [string, string, string] }> = {
  'poke-ball': { light: ['#E3350D', '#CC0000', '#E3350D'], dark: ['#BB4A26', '#9C0D0D', '#F2694A'] },
  'great-ball': { light: ['#2170C4', '#16498C', '#D2352C'], dark: ['#1B5AA3', '#10386A', '#FF6B60'] },
  'ultra-ball': { light: ['#2A2A2F', '#141417', '#A87A00'], dark: ['#232327', '#111113', '#F7C724'] },
  'master-ball': { light: ['#6A3CA8', '#45237A', '#C73282'], dark: ['#4F2C80', '#321B56', '#FF7BC2'] },
  'beast-ball': { light: ['#2B3DA3', '#402A8C', '#6B7100'], dark: ['#23338A', '#35237A', '#E9F05A'] },
  'luxury-ball': { light: ['#1E1E20', '#7A1915', '#9A700C'], dark: ['#1A1A1C', '#5C120F', '#EBC04A'] },
  'quick-ball': { light: ['#2A5BBE', '#1A3C85', '#946A00'], dark: ['#1F4AA0', '#142F6B', '#FFD431'] },
  'dusk-ball': { light: ['#1B2A1F', '#101A13', '#1F8A33'], dark: ['#18251B', '#0C140F', '#4CD964'] },
  'timer-ball': { light: ['#F2F2F5', '#DADBE0', '#CF2F29'], dark: ['#2B2423', '#1A1514', '#FF5C54'] },
  'net-ball': { light: ['#0E8290', '#2B2F33', '#0E7F8C'], dark: ['#0F6B76', '#1E2124', '#3FD6E4'] },
};
