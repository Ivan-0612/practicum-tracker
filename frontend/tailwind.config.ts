import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ufv: {
          blanco: "#ffffff",
          azul: "#003866",
          "azul-oscuro": "#001a33",
          "azul-claro": "#639eff",
          "rosa-claro": "#ff5c73",
          "rosa-oscuro": "#bf3657",
        },
      },
    },
  },
  plugins: [],
};
export default config;