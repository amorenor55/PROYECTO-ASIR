// Configuración del entorno de Next.js. Las claves son propias del framework.
import path from "node:path";
import { fileURLToPath } from "node:url";
const carpetaProyecto = path.dirname(fileURLToPath(import.meta.url));
export default {
  poweredByHeader: false,
  outputFileTracingRoot: carpetaProyecto,
  turbopack: { root: carpetaProyecto },
  experimental: { cpus: 2 },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};
