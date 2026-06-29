import type { BallStyle } from './BallPrefContext';

/**
 * Companion data for the Poké Ball site themes. Keep in sync with the
 * [data-ball=…] blocks in src/index.css — these hexes exist because CSS
 * variables can't reach the theme-color meta tag or inline swatch dots.
 *
 * One convention across every ball, sampled from its current logo art in
 * scripts/generate-brand-assets.mjs: the band is the shell, the footer the
 * shell's deeper companion or the ball's second colour, the accent its
 * signature marking — and no two balls share a band or an accent. Timer flips
 * polarity (white shell band, dark text); Net inverts band and accent (the
 * grey cage is the chrome, the teal shell the accent).
 */

/** [band, footer, accent] dots for the Settings preview, per resolved theme. */
export const BALL_SWATCHES: Record<BallStyle, { light: [string, string, string]; dark: [string, string, string] }> = {
  'poke-ball': { light: ['#E3350D', '#CC0000', '#E3350D'], dark: ['#BB4A26', '#9C0D0D', '#F2694A'] },
  'great-ball': { light: ['#17579E', '#0F3A6B', '#D92019'], dark: ['#12467E', '#0B2C52', '#F95449'] },
  'ultra-ball': { light: ['#232326', '#0F0F12', '#8A6D10'], dark: ['#1C1C20', '#0B0B0E', '#F8D23A'] },
  'master-ball': { light: ['#7240C0', '#502D86', '#CD2470'], dark: ['#563090', '#3C2265', '#EB5CAE'] },
  'beast-ball': { light: ['#23359F', '#553496', '#2E6D93'], dark: ['#1C2B7F', '#442A78', '#A9D2E8'] },
  'luxury-ball': { light: ['#1A191D', '#7F1B2B', '#C42A42'], dark: ['#141317', '#661622', '#E4586C'] },
  'quick-ball': { light: ['#1F7EBF', '#14527C', '#9A6D00'], dark: ['#196599', '#0E3C5C', '#F4C914'] },
  'dusk-ball': { light: ['#233024', '#8B3D15', '#2F7526'], dark: ['#1B241C', '#5A280E', '#66C554'] },
  'timer-ball': { light: ['#F4F4F8', '#C6C6D6', '#B22A25'], dark: ['#2A2928', '#191818', '#F7776E'] },
  'net-ball': { light: ['#4C515D', '#3A3E48', '#0B7A7E'], dark: ['#3B404A', '#22252B', '#3BC5CB'] },
};

/** Light-mode header band per ball, for <meta name="theme-color">. */
export const BALL_THEME_COLOR = Object.fromEntries(
  (Object.keys(BALL_SWATCHES) as BallStyle[]).map((ball) => [ball, BALL_SWATCHES[ball].light[0]]),
) as Record<BallStyle, string>;
