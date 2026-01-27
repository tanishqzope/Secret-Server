/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        colors: {
            // Soothing dark theme palette
            dark: {
                900: '#121212', // Background
                800: '#1e1e1e', // Panels
                700: '#2d2d2d', // Secondary panels
            },
            primary: {
                DEFAULT: '#8b5cf6', // Soft violet
                hover: '#7c3aed'
            },
            accent: '#10b981' // Soft emerald
        }
      },
    },
    plugins: [],
  }
