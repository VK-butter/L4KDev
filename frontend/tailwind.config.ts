import type { Config } from 'tailwindcss';
import { brandPalette } from './src/theme/tokens';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './src/**/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: brandPalette.brand,
        accent: brandPalette.accent,
        surface: brandPalette.surface
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 10px 25px -15px rgba(16, 185, 129, 0.55)'
      }
    }
  },
  plugins: []
};

export default config;
