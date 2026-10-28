import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://api-testing.myretailos.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
// Trigger Vite restart to recognize country-state-city dependency
// Second restart to ensure cache is cleared
