import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-docs',
      configureServer(server) {
        const docsDir = path.resolve(__dirname, 'public/docs');
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          if (!url.startsWith('/docs')) return next();
          const subPath = url.replace('/docs', '') || '/index.html';
          const filePath = path.join(docsDir, subPath.split('?')[0]);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.end(fs.readFileSync(filePath));
          } else {
            res.end(fs.readFileSync(path.join(docsDir, 'index.html')));
          }
        });
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      "@candyfight/shared": path.resolve(__dirname, "../shared")
    }
  }
});
