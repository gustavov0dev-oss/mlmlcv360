// vite.config.ts
import path from "path";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "spa-fallback",
      configureServer(server) {
        server.middlewares.use((_req, _res, next) => {
          const url = _req.url || "";
          if (!url.startsWith("/@") && !url.startsWith("/src/") && !url.includes(".") && !url.startsWith("/api/")) {
            _req.url = "/index.html";
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, _res, next) => {
          const url = _req.url || "";
          if (!url.startsWith("/@") && !url.startsWith("/src/") && !url.includes(".") && !url.startsWith("/api/")) {
            _req.url = "/index.html";
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  optimizeDeps: {
    exclude: ["lucide-react"]
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "supabase": ["@supabase/supabase-js"],
          "radix-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-accordion",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-toast",
            "@radix-ui/react-avatar",
            "@radix-ui/react-label",
            "@radix-ui/react-separator",
            "@radix-ui/react-scroll-area"
          ],
          "tiptap": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-link",
            "@tiptap/extension-text-align",
            "@tiptap/extension-underline"
          ],
          "charts": ["recharts"],
          "forms": ["react-hook-form", "zod", "@hookform/resolvers"],
          "utils": ["date-fns", "clsx", "tailwind-merge", "class-variance-authority"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ3NwYS1mYWxsYmFjaycsXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XG4gICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKF9yZXEsIF9yZXMsIG5leHQpID0+IHtcbiAgICAgICAgICBjb25zdCB1cmwgPSBfcmVxLnVybCB8fCAnJztcbiAgICAgICAgICBpZiAoIXVybC5zdGFydHNXaXRoKCcvQCcpICYmICF1cmwuc3RhcnRzV2l0aCgnL3NyYy8nKSAmJiAhdXJsLmluY2x1ZGVzKCcuJykgJiYgIXVybC5zdGFydHNXaXRoKCcvYXBpLycpKSB7XG4gICAgICAgICAgICBfcmVxLnVybCA9ICcvaW5kZXguaHRtbCc7XG4gICAgICAgICAgfVxuICAgICAgICAgIG5leHQoKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgICAgY29uZmlndXJlUHJldmlld1NlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgoX3JlcSwgX3JlcywgbmV4dCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHVybCA9IF9yZXEudXJsIHx8ICcnO1xuICAgICAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJy9AJykgJiYgIXVybC5zdGFydHNXaXRoKCcvc3JjLycpICYmICF1cmwuaW5jbHVkZXMoJy4nKSAmJiAhdXJsLnN0YXJ0c1dpdGgoJy9hcGkvJykpIHtcbiAgICAgICAgICAgIF9yZXEudXJsID0gJy9pbmRleC5odG1sJztcbiAgICAgICAgICB9XG4gICAgICAgICAgbmV4dCgpO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSxcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGV4Y2x1ZGU6IFsnbHVjaWRlLXJlYWN0J10sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiA2MDAsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICdzdXBhYmFzZSc6IFsnQHN1cGFiYXNlL3N1cGFiYXNlLWpzJ10sXG4gICAgICAgICAgJ3JhZGl4LXVpJzogW1xuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXAnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1wb3BvdmVyJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtYWNjb3JkaW9uJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtY2hlY2tib3gnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zd2l0Y2gnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWF2YXRhcicsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWxhYmVsJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VwYXJhdG9yJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2Nyb2xsLWFyZWEnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgJ3RpcHRhcCc6IFtcbiAgICAgICAgICAgICdAdGlwdGFwL3JlYWN0JyxcbiAgICAgICAgICAgICdAdGlwdGFwL3N0YXJ0ZXIta2l0JyxcbiAgICAgICAgICAgICdAdGlwdGFwL2V4dGVuc2lvbi1saW5rJyxcbiAgICAgICAgICAgICdAdGlwdGFwL2V4dGVuc2lvbi10ZXh0LWFsaWduJyxcbiAgICAgICAgICAgICdAdGlwdGFwL2V4dGVuc2lvbi11bmRlcmxpbmUnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgJ2NoYXJ0cyc6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAnZm9ybXMnOiBbJ3JlYWN0LWhvb2stZm9ybScsICd6b2QnLCAnQGhvb2tmb3JtL3Jlc29sdmVycyddLFxuICAgICAgICAgICd1dGlscyc6IFsnZGF0ZS1mbnMnLCAnY2xzeCcsICd0YWlsd2luZC1tZXJnZScsICdjbGFzcy12YXJpYW5jZS1hdXRob3JpdHknXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5TixPQUFPLFVBQVU7QUFDMU8sT0FBTyxXQUFXO0FBQ2xCLFNBQVMsb0JBQW9CO0FBRjdCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQSxJQUNOO0FBQUEsTUFDRSxNQUFNO0FBQUEsTUFDTixnQkFBZ0IsUUFBUTtBQUN0QixlQUFPLFlBQVksSUFBSSxDQUFDLE1BQU0sTUFBTSxTQUFTO0FBQzNDLGdCQUFNLE1BQU0sS0FBSyxPQUFPO0FBQ3hCLGNBQUksQ0FBQyxJQUFJLFdBQVcsSUFBSSxLQUFLLENBQUMsSUFBSSxXQUFXLE9BQU8sS0FBSyxDQUFDLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLFdBQVcsT0FBTyxHQUFHO0FBQ3ZHLGlCQUFLLE1BQU07QUFBQSxVQUNiO0FBQ0EsZUFBSztBQUFBLFFBQ1AsQ0FBQztBQUFBLE1BQ0g7QUFBQSxNQUNBLHVCQUF1QixRQUFRO0FBQzdCLGVBQU8sWUFBWSxJQUFJLENBQUMsTUFBTSxNQUFNLFNBQVM7QUFDM0MsZ0JBQU0sTUFBTSxLQUFLLE9BQU87QUFDeEIsY0FBSSxDQUFDLElBQUksV0FBVyxJQUFJLEtBQUssQ0FBQyxJQUFJLFdBQVcsT0FBTyxLQUFLLENBQUMsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksV0FBVyxPQUFPLEdBQUc7QUFDdkcsaUJBQUssTUFBTTtBQUFBLFVBQ2I7QUFDQSxlQUFLO0FBQUEsUUFDUCxDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTLENBQUMsY0FBYztBQUFBLEVBQzFCO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsVUFDWixnQkFBZ0IsQ0FBQyxTQUFTLFdBQVc7QUFBQSxVQUNyQyxZQUFZLENBQUMsdUJBQXVCO0FBQUEsVUFDcEMsWUFBWTtBQUFBLFlBQ1Y7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsVUFBVTtBQUFBLFlBQ1I7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsVUFBVSxDQUFDLFVBQVU7QUFBQSxVQUNyQixTQUFTLENBQUMsbUJBQW1CLE9BQU8scUJBQXFCO0FBQUEsVUFDekQsU0FBUyxDQUFDLFlBQVksUUFBUSxrQkFBa0IsMEJBQTBCO0FBQUEsUUFDNUU7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
