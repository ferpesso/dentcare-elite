/**
 * useOfflineSync.ts — Gestão de Sincronização Offline
 * DentCare Elite V32.8
 *
 * Gere a fila de operações offline usando IndexedDB.
 * Quando a ligação é restaurada, sincroniza automaticamente
 * todas as mutações pendentes com o servidor.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const DB_NAME = 'dentcare-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'offline-queue';

export interface OfflineQueueEntry {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retries: number;
}

// ─── Abrir / inicializar o IndexedDB ─────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(entry: OfflineQueueEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueue(): Promise<OfflineQueueEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).index('timestamp').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ─── Hook principal ───────────────────────────────────────────────────────────
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const isSyncing = useRef(false);

  // Sincronizar a fila quando a ligação for restaurada
  const syncQueue = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const queue = await getQueue();
      if (queue.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log(`[DentCare Offline] A sincronizar ${queue.length} operação(ões) pendente(s)...`);

      let syncedCount = 0;
      for (const entry of queue) {
        try {
          const response = await fetch(entry.url, {
            method: entry.method,
            headers: {
              ...entry.headers,
              'Content-Type': 'application/json',
            },
            body: entry.body,
            credentials: 'include',
          });

          if (response.ok) {
            await removeFromQueue(entry.id);
            syncedCount++;
          } else if (response.status >= 400 && response.status < 500) {
            // Erro de cliente (ex: dados inválidos) — remover da fila sem retentar
            console.warn(`[DentCare Offline] Operação ${entry.id} rejeitada (${response.status}). Removida da fila.`);
            await removeFromQueue(entry.id);
          }
          // Erros 5xx: manter na fila para retentar
        } catch {
          // Ainda sem ligação — parar a sincronização
          break;
        }
      }

      if (syncedCount > 0) {
        console.log(`[DentCare Offline] ${syncedCount} operação(ões) sincronizada(s) com sucesso.`);
        // Invalidar todo o cache para refletir os dados sincronizados
        queryClient.invalidateQueries();
      }
    } finally {
      isSyncing.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    // Registar o Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('[DentCare PWA] Service Worker registado:', registration.scope);
        })
        .catch((error) => {
          console.warn('[DentCare PWA] Falha ao registar Service Worker:', error);
        });

      // Ouvir mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data?.type === 'OFFLINE_MUTATION_QUEUED') {
          const entry: OfflineQueueEntry = {
            ...event.data.payload,
            retries: 0,
          };
          await addToQueue(entry);
          console.log('[DentCare Offline] Operação guardada na fila:', entry.id);
        }

        if (event.data?.type === 'SYNC_OFFLINE_QUEUE') {
          await syncQueue();
        }
      });
    }

    // Sincronizar quando a ligação for restaurada
    const handleOnline = () => {
      console.log('[DentCare] Ligação restaurada. A sincronizar...');
      syncQueue();
    };

    window.addEventListener('online', handleOnline);

    // Tentar sincronizar imediatamente se já estiver online
    if (navigator.onLine) {
      syncQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncQueue]);

  return { syncQueue, getQueueCount };
}
