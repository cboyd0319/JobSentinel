import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Vite options tailored for Tauri development
  clearScreen: false,

  // Tauri expects a fixed port, fail if that port is not available
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      // Tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },

  // Build optimizations for tree-shaking and code splitting
  build: {
    // Enable minification
    minify: "esbuild",
    // Tree-shaking optimization
    rollupOptions: {
      output: {
        // Manual chunks for better caching and lazy loading
        // Note: recharts bundle is ~387KB due to d3 dependencies
        // This is lazy-loaded via React.lazy() in Market.tsx and Applications.tsx
        manualChunks(id) {
          // Group recharts and d3 dependencies into a single charts chunk
          // This chunk is lazy-loaded when users view chart components
          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }
        },
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
      },
    },
    // Report compressed size
    reportCompressedSize: true,
  },
});
