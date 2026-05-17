const CACHE_NAME = 'lotomo-pos-v1';

// Install event - cache essential assets if necessary, or just a bypass
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch event - simple network-first strategy or network-only
// We want active connection for Supabase, so network-only or simple pass-through is perfect for POS
self.addEventListener('fetch', (event) => {
  // Let browser handle requests normally, no complex offline caching to prevent Supabase sync issues
  return;
});
