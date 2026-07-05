// tailwind.config.ts — tells Tailwind where to look for class names.
// Tailwind scans the listed files and only includes CSS for classes it actually finds,
// keeping the final stylesheet small.
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
