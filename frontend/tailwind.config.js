/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#060911',
          900: '#0a0f1d',
          850: '#0f172a',
          800: '#151e36',
          750: '#1b2744',
          700: '#223154',
          600: '#2d406d',
        },
        slate: {
          850: '#111827',
          900: '#0f172a',
          950: '#090d16',
        },
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.25)',
        'elevated': '0 12px 36px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'glow-primary': '0 0 25px -4px rgba(99, 102, 241, 0.25)',
        'glow-emerald': '0 0 25px -4px rgba(16, 185, 129, 0.25)',
        'glow-rose': '0 0 25px -4px rgba(244, 63, 94, 0.25)',
      }
    },
  },
  plugins: [],
}
