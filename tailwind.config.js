/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEEDF9',
          100: '#D5D3F1',
          200: '#ABA7E3',
          300: '#817BD5',
          400: '#574FC7',
          500: '#534AB7',
          600: '#3F3890',
          700: '#2D286A',
          800: '#1B1843',
          900: '#09081C',
        },
        secondary: {
          50:  '#E6F2EF',
          100: '#C2DFD8',
          200: '#84BFB1',
          300: '#489F8A',
          400: '#1A7F65',
          500: '#0F6E56',
          600: '#0B5542',
          700: '#083D2F',
          800: '#04261D',
          900: '#010E0B',
        },
        accent: {
          50:  '#F5EDE3',
          100: '#E8D4BA',
          200: '#D1A975',
          300: '#BA7E30',
          400: '#9C680E',
          500: '#854F0B',
          600: '#693E09',
          700: '#4D2E07',
          800: '#321E04',
          900: '#160E02',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(83,74,183,0.08)',
        'card-hover': '0 6px 24px 0 rgba(83,74,183,0.16)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { transform: 'translateY(12px)', opacity: 0 }, to: { transform: 'translateY(0)', opacity: 1 } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
    },
  },
  plugins: [],
}
