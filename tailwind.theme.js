// Theme preset: colours listed here read CSS variables from src/theme.css.
// The light values are Tailwind's stock colours, so the light design is
// unchanged; [data-theme="dark"] swaps them for a softer dark palette.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (prefix, keys) => Object.fromEntries(keys.map((k) => [k, v(`${prefix}-${k}`)]));
const ACCENTS = ["indigo", "rose", "amber", "emerald"];

export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        slate: scale("slate", [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]),
        // Light tints (backgrounds, rings) become dark tints.
        ...Object.fromEntries(ACCENTS.map((c) => [c, scale(c, [50, 100])])),
      },
      // Only bg-white flips; text-white on coloured buttons stays white.
      backgroundColor: { white: v("surface") },
      // Dark accent text becomes a light tint so it stays readable.
      textColor: {
        ...Object.fromEntries(ACCENTS.map((c) => [c, scale(`text-${c}`, [600, 700, 800, 900])])),
        lime: { 700: v("text-lime-700") },
      },
    },
  },
};
