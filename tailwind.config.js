/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          dark: '#155FA0',
        },
        success: '#43A047',
        warning: '#F57C00',
        danger: '#E91E63',
      },
    },
  },
  plugins: [],
}
