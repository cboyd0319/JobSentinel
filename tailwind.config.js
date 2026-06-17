/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // Quiet Shield: protective navy surfaces with teal action color.
      colors: {
        sentinel: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0F766E',
          700: '#115E59',
          800: '#134E4A',
          900: '#0F3F3A',
          950: '#042F2E',
        },
        // Amber is caution and missing evidence, never high-match color.
        alert: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        surface: {
          50: '#F6F8F7',
          100: '#EEF3F1',
          200: '#D6E0DC',
          300: '#B7C4C0',
          400: '#94A3B8',
          500: '#6B7280',
          600: '#475569',
          700: '#334155',
          800: '#1F2937',
          900: '#0B1020',
          950: '#060A14',
        },
        success: '#22C55E',
        warning: '#FBBF24',
        danger: '#F87171',
        info: '#38BDF8',
      },
      fontFamily: {
        display: ['Inter', '"IBM Plex Sans"', '"Source Sans 3"', 'system-ui', 'sans-serif'],
        body: ['Inter', '"IBM Plex Sans"', '"Source Sans 3"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        // Custom scale with tighter line heights for display
        'display-2xl': ['3rem', { lineHeight: '1.1', letterSpacing: '0', fontWeight: '700' }],
        'display-xl': ['2.25rem', { lineHeight: '1.15', letterSpacing: '0', fontWeight: '700' }],
        'display-lg': ['1.5rem', { lineHeight: '1.2', letterSpacing: '0', fontWeight: '600' }],
        'display-md': ['1.25rem', { lineHeight: '1.25', letterSpacing: '0', fontWeight: '600' }],
      },
      spacing: {
        // Custom rhythm (not default 4px base)
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        // Mixed border treatments
        'none': '0',
        'sm': '0.25rem',
        'DEFAULT': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
        'card': '0.5rem',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 20px -16px rgba(15, 23, 42, 0.22)',
        'card': '0 8px 28px -18px rgba(15, 23, 42, 0.35)',
        'card-hover': '0 14px 36px -22px rgba(15, 23, 42, 0.45)',
        'glow': '0 0 0 1px rgba(45, 212, 191, 0.22), 0 10px 32px -24px rgba(45, 212, 191, 0.45)',
        'alert-glow': '0 0 0 1px rgba(251, 191, 36, 0.2), 0 10px 32px -24px rgba(251, 191, 36, 0.42)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'score-fill': 'scoreFill 1s ease-out forwards',
        'progress-indeterminate': 'progressIndeterminate 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        scan: {
          '0%, 100%': { opacity: '0.4', transform: 'translateY(0)' },
          '50%': { opacity: '1', transform: 'translateY(-4px)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scoreFill: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--score-width)' },
        },
        progressIndeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
