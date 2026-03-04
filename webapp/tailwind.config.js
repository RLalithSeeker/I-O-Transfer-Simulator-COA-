/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#7c39ef',
        'bg-dark': '#0a0b0f',
        surface: '#111318',
        surface2: '#181c27',
        'border-mute': '#2e2839',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'ping-slow': 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
        'spin-slow': 'spin 2s linear infinite',
      },
    },
  },
  plugins: [],
}
