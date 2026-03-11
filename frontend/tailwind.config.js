/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#faf8f5',
        surface: '#ffffff',
        border: '#eeeeee',
        'border-hover': '#dddddd',
        primary: {
          DEFAULT: '#3d5a80',
          hover: '#2c4460',
          light: '#eef2f7',
        },
        heading: '#2c2c2c',
        secondary: '#999999',
        muted: '#bbbbbb',
        success: {
          DEFAULT: '#2e7d32',
          bg: '#e8f5e9',
        },
        danger: {
          DEFAULT: '#c62828',
          bg: '#fbe9e7',
        },
        warning: {
          DEFAULT: '#e65100',
          bg: '#fff3e0',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        button: '8px',
        pill: '20px',
        modal: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
