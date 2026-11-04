/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        eng: {
          bg: '#090D12',
          surface: '#101720',
          elevated: '#151F2B',
          accent: '#356B62',
          'accent-light': '#5B9B8D',
          border: '#25332F',
          'border-subtle': '#1B2623',
          text: '#F1F5F4',
          muted: '#96A6A3',
        },
        brand: {
          primary: '#356B62',
          hover: '#2D5E56',
          highlight: '#5B9B8D',
          bg: '#090D12',
          surface: '#101720',
          elevated: '#151F2B',
          border: '#25332F',
          text: '#F1F5F4',
          muted: '#96A6A3',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
