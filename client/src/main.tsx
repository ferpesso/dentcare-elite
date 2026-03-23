import React from 'react';
import ReactDOM from 'react-dom/client';
import './globals.css';
import './i18n'; // Inicializar sistema de traduções
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import { Router, Route, Switch, Redirect } from 'wouter';

// Componentes de Layout
import { AppLayout } from './components/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { ToastProvider } from './components/ToastNotification';
import { GlobalSearch } from './components/GlobalSearch';
// FIX V35.5: ErrorBoundary global para evitar crash total da aplicação
import { ErrorBoundary } from './components/ErrorBoundary';

// Páginas
import { DashboardPage } from './pages/DashboardPage';

import { MarketingPage } from './pages/MarketingPage';
import { ConfiguracaoWhatsAppPage } from './pages/ConfiguracaoWhatsAppPage';
import { SocialHubProPage } from './pages/SocialHubProPage';
import { AgendaPage } from './pages/AgendaPage';
import { UtentesPage } from './pages/UtentesPage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { FaturacaoPage } from './pages/FaturacaoPage';
import { StocksPage } from './pages/StocksPage';
import { EquipaPage } from './pages/EquipaPage';
import { PermissoesPage } from './pages/PermissoesPage';
import { VoiceBriefingPage } from './pages/VoiceBriefingPage';
import { AlertasSaudePage } from './pages/AlertasSaudePage';
import { IAPreditivaPage } from './pages/IAPreditivaPage';
import { OdontogramaPage } from './pages/OdontogramaPage';
import { ImagemPage } from './pages/ImagemPage';
import { AnamnesePage } from './pages/AnamnesePage';
import { TermosConsentimentoPage } from './pages/TermosConsentimentoPage';
import { LigacoesPage } from './pages/LigacoesPage';
import { SistemaPage } from './pages/SistemaPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LaboratoriosPage } from './pages/LaboratoriosPage';
import { IAAgentPage } from './pages/IAAgentPage';
import { HealthScorePage } from './pages/HealthScorePage';
import { ConectoresPage } from './pages/ConectoresPage';
import { MigracaoPage } from './pages/MigracaoPage';
import RelatoriosPage from './pages/RelatoriosPage';
import { trpc } from './lib/trpc';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider } from './contexts/ConfigContext';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SmartCommandBar } from './components/SmartCommandBar';
import { useKeyboardShortcuts, KeyboardShortcutsOverlay } from './hooks/useKeyboardShortcuts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: 0 garante que os dados são sempre considerados desatualizados,
      // forçando refetch automático sempre que uma query é reutilizada após mutação.
      staleTime: 0,
      gcTime: 1000 * 60 * 10, // 10 minutos
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Após qualquer mutação bem-sucedida, invalida TODO o cache do React Query.
      // Isto garante que todas as páginas (Agenda, Dashboard, Faturacao, etc.)
      // recarregam automaticamente os dados atualizados sem necessidade de F5.
      onSuccess: () => {
        queryClient.invalidateQueries();
      },
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      // @ts-ignore
      transformer: superjson,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include',
        });
      },
    }),
  ],
});

// ============================================================
// Componente de Proteção de Rota
// ============================================================

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-base)]">
        <div className="text-center">
          <div className="relative w-12 h-12 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: 'rgba(0, 229, 255, 0.15)' }}></div>
            <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#00E5FF' }}></div>
            <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00E5FF, #B388FF)' }}>
              <span className="font-bold text-xs" style={{ color: '#050A14' }}>B</span>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// ============================================================
// App Principal com Roteamento
// ============================================================

function KeyboardShortcutsWrapper({ children }: { children: React.ReactNode }) {
  const { atalhos, mostrarAjuda, setMostrarAjuda } = useKeyboardShortcuts();
  return (
    <>
      {children}
      <KeyboardShortcutsOverlay atalhos={atalhos} aberto={mostrarAjuda} onFechar={() => setMostrarAjuda(false)} />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <ConfigProvider>
            {/* FIX V35.5: ErrorBoundary global — evita crash total da aplicação */}
            <ErrorBoundary zona="Aplicação">
            <Router>
          <Switch>
            {/* Rota de Login */}
            <Route path="/login" component={LoginPage} />

            {/* Rotas Protegidas */}
            <Route path="/dashboard">
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </Route>

            {/* Rotas Genéricas (Placeholder) */}
            <Route path="/agenda">
              <ProtectedRoute>
                <AgendaPage />
              </ProtectedRoute>
            </Route>

            <Route path="/ligacoes">
              <ProtectedRoute>
                <LigacoesPage />
              </ProtectedRoute>
            </Route>

            <Route path="/utentes">
              <ProtectedRoute>
                <UtentesPage />
              </ProtectedRoute>
            </Route>

            <Route path="/odontograma">
              <ProtectedRoute>
                <OdontogramaPage />
              </ProtectedRoute>
            </Route>

            <Route path="/imagiologia">
              <ProtectedRoute>
                <ImagemPage />
              </ProtectedRoute>
            </Route>

            <Route path="/anamnese">
              <ProtectedRoute>
                <AnamnesePage />
              </ProtectedRoute>
            </Route>

            <Route path="/financeiro">
              <ProtectedRoute>
                <FinanceiroPage />
              </ProtectedRoute>
            </Route>

            <Route path="/marketing">
              <ProtectedRoute>
                <MarketingPage />
              </ProtectedRoute>
            </Route>

            <Route path="/faturacao">
              <ProtectedRoute>
                <FaturacaoPage />
              </ProtectedRoute>
            </Route>

            <Route path="/stocks">
              <ProtectedRoute>
                <StocksPage />
              </ProtectedRoute>
            </Route>

            <Route path="/equipa">
              <ProtectedRoute>
                <EquipaPage />
              </ProtectedRoute>
            </Route>

            <Route path="/laboratorios">
              <ProtectedRoute>
                <LaboratoriosPage />
              </ProtectedRoute>
            </Route>



            <Route path="/configuracoes/whatsapp">
              <ProtectedRoute>
                <ConfiguracaoWhatsAppPage />
              </ProtectedRoute>
            </Route>

            <Route path="/ia-preditiva">
              <ProtectedRoute>
                <IAPreditivaPage />
              </ProtectedRoute>
            </Route>

            <Route path="/redes-sociais">
              <ProtectedRoute>
                <SocialHubProPage />
              </ProtectedRoute>
            </Route>

            <Route path="/assistente-ia">
              <ProtectedRoute>
                <IAAgentPage />
              </ProtectedRoute>
            </Route>

            <Route path="/voice-briefing">
              <ProtectedRoute>
                <VoiceBriefingPage />
              </ProtectedRoute>
            </Route>

            <Route path="/alertas">
              <ProtectedRoute>
                <AlertasSaudePage />
              </ProtectedRoute>
            </Route>

            <Route path="/health-score">
              <ProtectedRoute>
                <HealthScorePage />
              </ProtectedRoute>
            </Route>

            <Route path="/relatorios">
              <ProtectedRoute>
                <RelatoriosPage />
              </ProtectedRoute>
            </Route>

            <Route path="/configuracoes/permissoes">
              <ProtectedRoute>
                <PermissoesPage />
              </ProtectedRoute>
            </Route>

            <Route path="/configuracoes/termos">
              <ProtectedRoute>
                <TermosConsentimentoPage />
              </ProtectedRoute>
            </Route>

            <Route path="/configuracoes/conectores">
              <ProtectedRoute>
                <ConectoresPage />
              </ProtectedRoute>
            </Route>

            <Route path="/configuracoes/sistema">
              <ProtectedRoute>
                <SistemaPage />
              </ProtectedRoute>
            </Route>

            <Route path="/migracao">
              <ProtectedRoute>
                <MigracaoPage />
              </ProtectedRoute>
            </Route>
            {/* Rota Padrão */}
            <Route path="/">
              <Redirect to="/dashboard" />
            </Route>

            {/* 404 */}
            <Route>
              <div className="flex items-center justify-center h-screen bg-[var(--bg-base)]">
                <div className="text-center">
                  <p className="text-[80px] font-black text-gradient-brand leading-none mb-3">404</p>
                  <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>Página não encontrada</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>A rota solicitada não existe nesta aplicação.</p>
                </div>
              </div>
            </Route>
          </Switch>
          <GlobalSearch />
          <SmartCommandBar />
          <OfflineIndicator />
          <KeyboardShortcutsWrapper><></></KeyboardShortcutsWrapper>
        </Router>
            </ErrorBoundary>
            </ConfigProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </ToastProvider>
    </ThemeProvider>
  );
}

// ============================================================
// Render
// ============================================================

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
