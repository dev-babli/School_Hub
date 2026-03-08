/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/views/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        foreground: '#0f172a',
        background: '#ffffff',
        foreground: '#0f172a',
        skeleton: 'var(--skeleton)',
        border: 'var(--btn-border)',
        input: 'var(--input)',
        ring: '#3b82f6',
        primary: { DEFAULT: '#2563eb', foreground: '#ffffff' },
        secondary: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        destructive: { DEFAULT: '#dc2626', foreground: '#ffffff' },
        accent: { DEFAULT: '#f1f5f9', foreground: '#0f172a' },
        muted: { DEFAULT: '#f1f5f9', foreground: '#64748b' },
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
      boxShadow: {
        input: [
          '0px 2px 3px -1px rgba(0, 0, 0, 0.1)',
          '0px 1px 0px 0px rgba(25, 28, 33, 0.02)',
          '0px 0px 0px 1px rgba(25, 28, 33, 0.08)',
        ].join(', '),
      },
      animation: {
        ripple: 'ripple 2s ease calc(var(--i, 0) * 0.2s) infinite',
        orbit: 'orbit calc(var(--duration) * 1s) linear infinite',
      },
      keyframes: {
        ripple: {
          '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { transform: 'translate(-50%, -50%) scale(0.9)' },
        },
        orbit: {
          '0%': {
            transform:
              'rotate(0deg) translateY(calc(var(--radius) * 1px)) rotate(0deg)',
          },
          '100%': {
            transform:
              'rotate(360deg) translateY(calc(var(--radius) * 1px)) rotate(-360deg)',
          },
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  },
};
