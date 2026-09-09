import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const axiosEsmPath = path.join(
  path.dirname(require.resolve("axios/package.json")),
  "dist/esm/axios.js"
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      events: false,
      axios: axiosEsmPath,
    },
  },
});
