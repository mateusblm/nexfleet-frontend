import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// O shell não depende de @types/node; o Vite executa este arquivo no Node.
declare const process: { env: Record<string, string | undefined> };

// Gateway local; troque com NEXFLEET_GATEWAY_URL quando a porta 8080 estiver ocupada.
const gatewayUrl = process.env.NEXFLEET_GATEWAY_URL || "http://127.0.0.1:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    // Só o Gateway recebe chamadas da interface; nunca os serviços internos.
    proxy: { "/api": { target: gatewayUrl } },
  },
});
