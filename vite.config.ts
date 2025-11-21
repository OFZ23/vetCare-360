import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  base: "/vetCare-360/",

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // ESTA ES LA FORMA CORRECTA DE INYECTAR VARIABLES EN PRODUCCIÓN
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      mode === "production"
        ? "https://xueqqvtjflbyjlnpxwpg.supabase.co"     // ← TU URL REAL AQUÍ
        : process.env.VITE_SUPABASE_URL
    ),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(
      mode === "production"
        ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZXFxdnRqZmxieWpsbnB4d3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MjA4MTAsImV4cCI6MjA3ODk5NjgxMH0.GlGEa55_ecf2lZGvSibf4ipoIbLYNeae29olNOZVLFc"  // ← TU KEY REAL AQUÍ
        : process.env.VITE_SUPABASE_ANON_KEY
    ),
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "@tanstack/react-query"],
          ui: ["@radix-ui/react-slot", "class-variance-authority", "lucide-react"],
        },
      },
    },
  },
}));