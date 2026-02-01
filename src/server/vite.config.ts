import { defineConfig } from "vite";
import { builtinModules } from "node:module";

export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    outDir: "../../dist/server",
    emptyOutDir: true,
    ssr: true,
    lib: {
      entry: "index.ts",
      formats: ["cjs"],
      fileName: () => "index.cjs",
    },
    target: "node22",
    sourcemap: true,
    rollupOptions: {
      external: [...builtinModules],
    },
  },
});
