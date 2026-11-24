import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleApiAndLegacy } from "./server.mjs";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "local-api",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          handleApiAndLegacy(req, res).then((handled) => { if (!handled) next(); }, next);
        });
      }
    }
  ]
});
