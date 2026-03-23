/**
 * OfflineIndicator.tsx — Indicador de Estado de Ligação
 * DentCare Elite V32.8
 *
 * Mostra um banner persistente quando o utilizador está offline,
 * e uma notificação de sucesso quando a sincronização é concluída.
 */

import { useState, useEffect, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { useOfflineSync, getQueueCount } from '../lib/useOfflineSync';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const { syncQueue } = useOfflineSync();

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setIsSyncing(true);
      await syncQueue();
      await refreshPendingCount();
      setIsSyncing(false);
      setShowSyncSuccess(true);
      setTimeout(() => setShowSyncSuccess(false), 4000);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar fila pendente ao montar
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [syncQueue, refreshPendingCount]);

  const handleManualSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    await syncQueue();
    await refreshPendingCount();
    setIsSyncing(false);
    setShowSyncSuccess(true);
    setTimeout(() => setShowSyncSuccess(false), 3000);
  };

  // Nada a mostrar se online e sem pendentes e sem mensagem de sucesso
  if (isOnline && pendingCount === 0 && !showSyncSuccess) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">

      {/* Banner Offline */}
      {!isOnline && (
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-amber-500/30 bg-[#1a1a2e]/95 backdrop-blur-md text-sm font-medium text-amber-300 animate-in slide-in-from-bottom-4 duration-300">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>Modo offline — os dados são guardados localmente</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Banner de operações pendentes (quando volta a ficar online) */}
      {isOnline && pendingCount > 0 && !isSyncing && (
        <div
          className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-[var(--accent-border)] bg-[var(--bg-elevated)]/95 backdrop-blur-md text-sm font-medium text-[var(--accent-primary)] cursor-pointer hover:bg-[var(--bg-overlay)] transition-colors animate-in slide-in-from-bottom-4 duration-300"
          onClick={handleManualSync}
          title="Clique para sincronizar agora"
        >
          <Clock className="w-4 h-4 shrink-0" />
          <span>{pendingCount} operação{pendingCount !== 1 ? 'ões' : ''} por sincronizar</span>
          <RefreshCw className="w-3.5 h-3.5 ml-1 opacity-60" />
        </div>
      )}

      {/* Banner a sincronizar */}
      {isOnline && isSyncing && (
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-[var(--accent-border)] bg-[var(--bg-elevated)]/95 backdrop-blur-md text-sm font-medium text-[var(--accent-primary)] animate-in slide-in-from-bottom-4 duration-300">
          <RefreshCw className="w-4 h-4 shrink-0 animate-spin" />
          <span>A sincronizar dados com o servidor...</span>
        </div>
      )}

      {/* Banner de sucesso */}
      {showSyncSuccess && !isSyncing && (
        <div className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/30 bg-[#1a1a2e]/95 backdrop-blur-md text-sm font-medium text-emerald-300 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>Dados sincronizados com sucesso</span>
          <Wifi className="w-3.5 h-3.5 ml-1 opacity-60" />
        </div>
      )}
    </div>
  );
}
