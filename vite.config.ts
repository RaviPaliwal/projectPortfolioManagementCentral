import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin"
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), powerApps()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 5000,        rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@mui')) return 'mui-vendor';
              if (id.includes('recharts')) return 'recharts-vendor';
              return 'vendor';
            }
          }
        }
      }
  }
});
