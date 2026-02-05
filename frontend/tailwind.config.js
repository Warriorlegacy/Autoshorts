/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#0010FF',
        'primary-blue-light': '#3347FF',
        'primary-blue-dark': '#0000CC',
        'secondary-purple': '#7C3AED',
        'gray-900': '#111827',
        'gray-500': '#6B7280',
        'gray-100': '#F3F4F6',
        'status-scheduled': '#FEF3C7',
        'status-posted': '#D1FAE5',
        'status-failed': '#FEE2E2',
        'status-draft': '#E5E7EB',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // General body font
        heading: ['Plus Jakarta Sans', 'sans-serif'], // Headings
        special: ['DM Sans', 'sans-serif'], // Optional special headings
      }
    },
  },
  plugins: [],
}