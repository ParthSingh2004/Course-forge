import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    // Output a single IIFE bundle — no ES modules, no code-splitting.
    // This must work inside any LMS iframe without module support.
    lib: {
      entry: resolve(__dirname, "src/runtime.ts"),
      name: "CourseForgeRuntime",
      formats: ["iife"],
      fileName: () => "scorm-runtime.js",
    },
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,

    // Target ES2020 for broad LMS compatibility
    target: "es2020",

    // Minify with esbuild
    minify: "esbuild",
    sourcemap: false,

    // No code splitting — everything in one file
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
