import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "index.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        sourcemapFileNames: "[name].js.map",
      },
    },
  },
});
