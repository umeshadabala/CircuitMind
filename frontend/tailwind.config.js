/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#7C3AED',
          hover: '#6D28D9',
          highlight: '#A78BFA',
          bg: '#09090B',
          surface: '#111116',
          elevated: '#18181F',
          border: '#2A2A35',
          text: '#FAFAFA',
          muted: '#A1A1AA',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

