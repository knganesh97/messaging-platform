import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#667eea',
          dark: '#5568d3',
          light: '#e3f2fd',
        },
        secondary: {
          DEFAULT: '#764ba2',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
