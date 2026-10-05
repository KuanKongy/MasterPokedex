import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "fs";
import path from "path";

// The site lives under /MasterPokedex/, so public/favicon.ico is served there
// and the origin root has nothing at it. A browser that falls back to probing
// /favicon.ico gets a 404 and shows its blank page mark. Pages never sees that
// (the site is not at the origin root there either, but nothing probes a
// project page's root), so this is the dev server's job alone.
const rootFavicon = (): Plugin => ({
  name: "root-favicon",
  configureServer(server) {
    server.middlewares.use("/favicon.ico", (_req, res) => {
      res.setHeader("Content-Type", "image/x-icon");
      fs.createReadStream(path.resolve(__dirname, "public/favicon.ico")).pipe(res);
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // VITE_* vars live in the repo-root .env shared with the API.
  envDir: path.resolve(__dirname, "../.."),
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    rootFavicon()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: '/MasterPokedex/',
}));
