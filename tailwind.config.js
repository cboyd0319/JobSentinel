/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // JobSentinel Brand: Confident, Private, Intelligent, Vigilant
      colors: {
        // Primary: Deep teal - trust, security, intelligence
        sentinel: {
          50: '#E6F4F1',
          100: '#CCE9E3',
          200: '#99D3C7',
          300: '#66BDAB',
          400: '#33A78F',
          500: '#0D9373', // Primary brand
          600: '#0A7A5F',
          700: '#08614B',
          800: '#054837',
          900: '#032F24',
          950: '#011812',
        },
        // Accent: Warm amber - alerts, matches, opportunities
        alert: {
          50: '#FFF8E6',
          100: '#FFF1CC',
          200: '#FFE399',
          300: '#FFD566',
          400: '#FFC733',
          500: '#FFB800', // High-match gold
          600: '#CC9300',
          700: '#996E00',
          800: '#664A00',
          900: '#332500',
        },
        // Surface colors - subtle warmth
        surface: {
          50: '#FAFBFA',
          100: '#F4F6F5',
          200: '#E8EDEB',
          300: '#D1DBD7',
          400: '#9CAEA6',
          500: '#6B8077',
          600: '#4A5D54',
          700: '#364540',
          800: '#252F2B',
          900: '#141B18',
          950: '#0A0E0C',
        },
        // Semantic
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        // Display: Space Grotesk - modern, technical, confident
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        // Body: Inter - clean, readable, professional
        body: ['Inter', 'system-ui', 'sans-serif'],
        // Mono: JetBrains Mono - for scores/stats
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        // Custom scale with tighter line heights for display
        'display-2xl': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['1.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'display-md': ['1.25rem', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
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
        'card': '1.25rem', // Distinctive card radius
      },
      boxShadow: {
        // Subtle, sophisticated shadows
        'soft': '0 2px 8px -2px rgba(13, 147, 115, 0.08), 0 4px 16px -4px rgba(13, 147, 115, 0.12)',
        'card': '0 4px 12px -4px rgba(13, 147, 115, 0.1), 0 8px 24px -8px rgba(13, 147, 115, 0.08)',
        'card-hover': '0 8px 24px -4px rgba(13, 147, 115, 0.15), 0 16px 40px -8px rgba(13, 147, 115, 0.12)',
        'glow': '0 0 20px rgba(13, 147, 115, 0.3)',
        'alert-glow': '0 0 20px rgba(255, 184, 0, 0.4)',
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
