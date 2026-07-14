import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/",
  publicDir: "public",
  appType: "spa",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith(".css")
            ? "styles.css"
            : "assets/[name]-[hash][extname]"
      }
    }
  }
});
