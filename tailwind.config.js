import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          text: '#1f2937',
          muted: '#64748b',
          line: '#d8dee8',
          page: '#f4f6f9',
          surface: '#ffffff',
          primary: '#2454a6',
          primaryDark: '#1e4484',
          green: '#1f7a4d',
          red: '#b42318',
          amber: '#9a5b13',
          violet: '#6d45a4',
          teal: '#0f766e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        dialog: '0 24px 70px rgba(15, 23, 42, 0.28)',
        panel: '0 18px 40px rgba(31, 41, 55, 0.16)',
        node: '0 8px 20px rgba(31, 41, 55, 0.08)',
      },
    },
  },
  plugins: [typography],
}
