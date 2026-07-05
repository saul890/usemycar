// postcss.config.mjs — PostCSS is a CSS preprocessor that Tailwind runs through.
// This file just wires Tailwind and Autoprefixer (adds vendor prefixes for browser compat).
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

export default config
