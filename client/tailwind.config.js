/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
      },
      colors: {
        brand: {
          50: '#FFF5F0',
          100: '#FFE8DF',
          200: '#FFD0BF',
          300: '#FFA98F',
          400: '#FF825F',
          500: '#FF6B35', // Primary Warm Food Orange
          600: '#E85018',
          700: '#C23B0A',
          800: '#962E08',
          900: '#7A2506',
          950: '#431202',
        },
        grocery: {
          50: '#EDFCFA',
          100: '#D3F8F3',
          200: '#ACF2E9',
          300: '#7AE7DA',
          400: '#48D9C8',
          500: '#2EC4B6', // Leafy Green / Modern Teal
          600: '#22A89C',
          700: '#1D857C',
          800: '#1B6A63',
          900: '#1A5752',
          950: '#0C3532',
        },
        dark: {
          bg: '#0F172A',
          surface: '#1E293B',
          card: '#1E293B',
          border: '#334155',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Poppins', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'card': '0 2px 14px -2px rgba(0, 0, 0, 0.06)',
        'glow': '0 0 25px -5px rgba(255, 107, 53, 0.35)',
        'glow-grocery': '0 0 25px -5px rgba(46, 196, 182, 0.35)',
        'float': '0 14px 28px rgba(0,0,0,0.12), 0 10px 10px rgba(0,0,0,0.08)',
      },
      animation: {
        'shimmer': 'shimmer 1.8s infinite',
        'float': 'float 3s ease-in-out infinite',
        'pop': 'pop 0.3s ease-out forwards',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.95)' },
          '50%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
