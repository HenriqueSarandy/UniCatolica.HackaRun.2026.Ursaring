import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "node", env: { CAPIBOT_DB: ":memory:", GEMINI_API_KEY: "",
      PANEL_PASSWORD: "senha-de-teste",
      SESSION_SECRET: "segredo-de-teste",
      UPLOADS_DIR: path.resolve(__dirname, ".tmp-uploads"),
    },
  },
});
