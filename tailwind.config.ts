import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f7f8ed',
          100: '#ecefcd',
          200: '#dae0a0',
          300: '#c2cc6f',
          400: '#a8b549',
          500: '#8b9c34',
          600: '#6c7d28',
          700: '#535e22',
          800: '#444b21',
          900: '#3a4020',
          950: '#1f240e',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
