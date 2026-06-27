import type { BallStyle } from './BallPrefContext';

/**
 * Companion data for the Poké Ball site themes. Keep in sync with the
 * [data-ball=…] blocks in src/index.css — these hexes exist because CSS
 * variables can't reach the theme-color meta tag or inline swatch dots.
 */

/** Light-mode header band per ball, for <meta name="theme-color">. */
export const BALL_THEME_COLOR: Record<BallStyle, string> = {
  'poke-ball': '#E3350D',
  'great-ball': '#0F5CBD',
  'ultra-ball': '#222226',
  'master-ball': '#6D2E9E',
  'beast-ball': '#38418F',
  'luxury-ball': '#1F1F1F',
  'quick-ball': '#0973A5',
  'dusk-ball': '#1D352A',
  'timer-ball': '#EAECF0',
  'net-ball': '#18828B',
};

/** [band, footer, accent] dots for the Settings preview, per resolved theme. */
export const BALL_SWATCHES: Record<BallStyle, { light: [string, string, string]; dark: [string, string, string] }> = {
  'poke-ball': { light: ['#E3350D', '#CC0000', '#E3350D'], dark: ['#BB4A26', '#9C0D0D', '#F2694A'] },
  'great-ball': { light: ['#0F5CBD', '#08316E', '#0F5CBD'], dark: ['#1A4E94', '#10305F', '#5CA9F7'] },
  'ultra-ball': { light: ['#222226', '#151517', '#9F7502'], dark: ['#F2C40D', '#BC8F0F', '#F2C40D'] },
  'master-ball': { light: ['#6D2E9E', '#4E1F7A', '#6D2E9E'], dark: ['#5A2E7C', '#3F205C', '#C08FF0'] },
  'beast-ball': { light: ['#38418F', '#262F73', '#38418F'], dark: ['#30386F', '#20275A', '#9AA3EC'] },
  'luxury-ball': { light: ['#1F1F1F', '#121212', '#8B6A19'], dark: ['#1C1C1C', '#0D0D0D', '#EBC04A'] },
  'quick-ball': { light: ['#0973A5', '#0B4584', '#0973A5'], dark: ['#167EA0', '#116496', '#3ECBF4'] },
  'dusk-ball': { light: ['#1D352A', '#112318', '#17703F'], dark: ['#1A2E23', '#0F1E15', '#2CD87A'] },
  'timer-ball': { light: ['#EAECF0', '#D2D6DC', '#C61010'], dark: ['#2C3240', '#1D222B', '#F75B5B'] },
  'net-ball': { light: ['#18828B', '#0F5E66', '#127D75'], dark: ['#1C5E68', '#114A50', '#26D9D9'] },
};
