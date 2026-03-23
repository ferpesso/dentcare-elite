/**
 * ErrorBoundary.tsx — Componente de Tratamento de Erros Global
 * DentCare V35.5 — FIX: Adicionado ErrorBoundary para evitar crash total da aplicação
 *
 * Captura erros de renderização React e apresenta um ecrã de recuperação amigável
 * em vez de uma tela branca. Inclui botão para recarregar a página ou voltar ao dashboard.
 */
import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Fallback personalizado (opcional). Se não fornecido, usa o UI padrão. */
  fallback?: ReactNode;
  /** Identificador da zona para logging (ex: "AgendaPage", "Dashboard") */
  zona?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Logging do erro (pode ser substituído por Sentry ou similar)
    console.error(
      `[ErrorBoundary${this.props.zona ? `:${this.props.zona}` : ""}] Erro capturado:`,
      error,
      errorInfo
    );
  }

  handleRecarregar = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleIrParaDashboard = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.hasError) {
      // Se foi fornecido um fallback personalizado, usar esse
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            Ocorreu um erro inesperado
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-1 max-w-md">
            {this.props.zona
              ? `A secção "${this.props.zona}" encontrou um problema.`
              : "Esta secção encontrou um problema."}
          </p>
          <p className="text-[var(--text-muted)] text-xs mb-6 max-w-md">
            Os seus dados estão seguros. Pode tentar recarregar a secção ou voltar ao dashboard.
          </p>

          {/* Detalhes do erro em modo de desenvolvimento */}
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mb-6 text-left max-w-lg w-full">
              <summary className="text-xs text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)] mb-2">
                Detalhes técnicos (apenas em desenvolvimento)
              </summary>
              <pre className="text-xs bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg p-3 overflow-auto text-red-400 max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <div className="flex gap-3">
            <button
              onClick={this.handleRecarregar}
              className="btn-secondary px-4 py-2 flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              onClick={this.handleIrParaDashboard}
              className="btn-primary px-4 py-2 flex items-center gap-2 text-sm"
            >
              <Home className="w-4 h-4" />
              Ir para o Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC para envolver páginas com ErrorBoundary de forma conveniente.
 * Uso: export default withErrorBoundary(MinhaPage, "MinhaPage");
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  zona?: string
) {
  const displayName = zona || WrappedComponent.displayName || WrappedComponent.name || "Componente";

  function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary zona={displayName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  WithErrorBoundaryWrapper.displayName = `WithErrorBoundary(${displayName})`;
  return WithErrorBoundaryWrapper;
}
