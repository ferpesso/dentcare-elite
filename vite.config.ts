import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Garantir nomes de ficheiros previsíveis para evitar problemas de cache e MIME no Windows
        // FIX V35: Adicionar hash para cache busting em producao
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        // V35.5 — Chunks manuais para otimização de bundle (lazy loading por módulo)
        manualChunks: (id: string) => {
          // Vendor: React e ecossistema principal
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Vendor: tRPC + React Query
          if (id.includes('@trpc') || id.includes('@tanstack/react-query')) {
            return 'vendor-trpc';
          }
          // Vendor: Drizzle ORM
          if (id.includes('drizzle-orm')) {
            return 'vendor-drizzle';
          }
          // Vendor: Lucide Icons
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }
          // Vendor: Date-fns
          if (id.includes('date-fns')) {
            return 'vendor-datefns';
          }
          // Vendor: DnD Kit (Agenda)
          if (id.includes('@dnd-kit')) {
            return 'vendor-dnd';
          }
          // Vendor: jsPDF + PDF
          if (id.includes('jspdf') || id.includes('pdf')) {
            return 'vendor-pdf';
          }
          // Vendor: Recharts / Chart
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts';
          }
          // Vendor: Superjson + Zod
          if (id.includes('superjson') || id.includes('zod')) {
            return 'vendor-utils';
          }
          // Páginas de IA (chunk separado — carregadas apenas quando necessário)
          if (id.includes('IAAgentPage') || id.includes('IAPreditivaPage') || id.includes('AssistenteIA')) {
            return 'pages-ia';
          }
          // Páginas de Marketing
          if (id.includes('MarketingPage') || id.includes('SocialHub')) {
            return 'pages-marketing';
          }
          // Páginas Clínicas Avançadas
          if (id.includes('OdontogramaAvancado') || id.includes('OrtodontiaAvancada') || id.includes('ImagiologiaAvancada')) {
            return 'pages-clinica-avancada';
          }
          // Páginas Financeiras
          if (id.includes('FaturacaoPage') || id.includes('FinanceiroPage')) {
            return 'pages-financeiro';
          }
          // Páginas de Relatórios
          if (id.includes('RelatoriosPage') || id.includes('HealthScorePage')) {
            return 'pages-relatorios';
          }
        },
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
  server: {
    // Permitir qualquer host — necessário para proxy/sandbox
    middlewareMode: false,
    allowedHosts: true, // FIX V35: Permitir qualquer host (configurado via proxy reverso em producao)
    hmr: true, // FIX V35: HMR ativo em dev (desativado automaticamente em producao via build)
    proxy: {
      '/trpc': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
