/**
 * DentCare Elite — Service Worker
 * Estratégia: Cache-First para assets estáticos, Network-First para API,
 * com fila de sincronização para mutações offline.
 */

const CACHE_NAME = 'dentcare-v32-cache-v1';
const API_CACHE_NAME = 'dentcare-v32-api-cache-v1';
const OFFLINE_QUEUE_KEY = 'dentcare-offline-queue';

// Assets estáticos a pré-cachear
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// ─── Instalação: pré-cachear assets essenciais ───────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Ignorar erros de pré-cache em desenvolvimento
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Ativação: limpar caches antigos ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Intercepção de pedidos ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar pedidos não-HTTP (chrome-extension, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Ignorar pedidos de hot-reload do Vite em desenvolvimento
  if (url.pathname.startsWith('/@') || url.pathname.startsWith('/node_modules')) return;

  // ── API tRPC: Network-First com fallback para cache ──────────────────────
  if (url.pathname.startsWith('/api/trpc')) {
    // Mutações (POST): guardar na fila offline se sem ligação
    if (event.request.method === 'POST') {
      event.respondWith(handleMutation(event.request));
      return;
    }
    // Queries (GET/POST batch de leitura): Network-First com cache
    event.respondWith(networkFirstWithCache(event.request, API_CACHE_NAME));
    return;
  }

  // ── Assets estáticos: Cache-First ────────────────────────────────────────
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|ttf)$/) ||
    url.pathname === '/' ||
    url.pathname === '/index.html'
  ) {
    event.respondWith(cacheFirstWithNetwork(event.request, CACHE_NAME));
    return;
  }

  // ── Navegação SPA: sempre servir index.html do cache ─────────────────────
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/index.html').then((cached) =>
          cached || new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
        )
      )
    );
    return;
  }

  // ── Outros pedidos: Network-First ────────────────────────────────────────
  event.respondWith(networkFirstWithCache(event.request, CACHE_NAME));
});

// ─── Estratégia: Cache-First com fallback para rede ──────────────────────────
async function cacheFirstWithNetwork(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso não disponível offline', { status: 503 });
  }
}

// ─── Estratégia: Network-First com fallback para cache ───────────────────────
async function networkFirstWithCache(request, cacheName) {
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: 'offline', message: 'Sem ligação à internet. A mostrar dados em cache.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── Tratamento de mutações offline ──────────────────────────────────────────
async function handleMutation(request) {
  try {
    // Tentar enviar normalmente
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Sem ligação: guardar na fila de sincronização
    try {
      const body = await request.clone().text();
      const queueEntry = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        timestamp: Date.now(),
        id: Math.random().toString(36).substr(2, 9),
      };

      // Guardar na fila via IndexedDB (através de mensagem para o cliente)
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: 'OFFLINE_MUTATION_QUEUED',
          payload: queueEntry,
        });
      });

      // Resposta simulada de sucesso para não bloquear a UI
      return new Response(
        JSON.stringify({
          result: { data: { offlineQueued: true, message: 'Guardado localmente. Será sincronizado quando a ligação for restaurada.' } }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch {
      return new Response(
        JSON.stringify({ error: 'offline', message: 'Operação não disponível offline.' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
}

// ─── Sincronização em background quando a ligação é restaurada ───────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'dentcare-sync-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
  });
}

// ─── Mensagens do cliente ─────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_API_CACHE') {
    caches.delete(API_CACHE_NAME);
  }
});
