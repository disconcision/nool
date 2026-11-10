import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two pages: the hub (index.html) and the algebra studies (studies/), a
// trimmed Dragology demo gallery. base "./" so the build can be published
// under any path prefix.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // Only these entries: keeps Vite's dep scan out of the vendored sources'
  // stray files.
  optimizeDeps: {
    entries: ["index.html", "studies/index.html"],
  },
  build: {
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        studies: resolve(__dirname, "studies/index.html"),
      },
    },
  },
  // as upstream Dragology's vite config does (some deps peek at process.env)
  define: {
    "process.env": {},
  },
  server: {
    port: 3200,
    strictPort: true,
  },
});
