import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "/",
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://xueqqvtjflbyjlnpxwpg.supabase.co"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZXFxdnRqZmxieWpsbnB4d3BnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0MjA4MTAsImV4cCI6MjA3ODk5NjgxMH0.GlGEa55_ecf2lZGvSibf4ipoIbLYNeae29olNOZVLFc"),
  },
  },
}));


