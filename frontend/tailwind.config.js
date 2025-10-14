/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  // Tailwind CSS 4 uses CSS-based theme configuration in index.css
  // Most theme configuration has been moved to @theme directive
  plugins: [],
}
