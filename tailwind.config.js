import themePreset from './tailwind.theme.js'

/** @type {import('tailwindcss').Config} */
export default {
  presets: [themePreset],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand is Tailwind indigo; tints follow the theme (see src/theme.css).
        brand: {
          50: 'rgb(var(--indigo-50) / <alpha-value>)',
          100: 'rgb(var(--indigo-100) / <alpha-value>)',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      textColor: {
        brand: {
          600: 'rgb(var(--text-indigo-600) / <alpha-value>)',
          700: 'rgb(var(--text-indigo-700) / <alpha-value>)',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -12px rgb(15 23 42 / 0.18)',
      },
    },
  },
  plugins: [],
}
