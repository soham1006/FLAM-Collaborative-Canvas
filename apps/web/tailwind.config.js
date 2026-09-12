/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: 'var(--canvas-bg)',
          dot: 'var(--canvas-dot)',
        },
        surface: {
          panel: 'var(--surface-panel)',
          border: 'var(--surface-panel-border)',
          elevated: 'var(--surface-elevated)',
        },
        brand: {
          primary: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          light: 'var(--accent-light)',
        },
      },
    },
  },
  plugins: [],
};
