import type { Config } from "tailwindcss";

export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        moss: "#2f6f5e",
        coral: "#d96c54",
        skyline: "#4b7bec"
      }
    }
  },
  plugins: []
} satisfies Config;
