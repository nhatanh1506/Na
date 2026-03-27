/* ════════════════════════════════════════
   Focus Pet — Service Worker
   Caches the app shell for offline / PWA use.
   Audio files are fetched from network and
   cached on first load for offline playback.
════════════════════════════════════════ */

const CACHE_NAME = 'focus-pet-v2';

// App shell — always cached
const SHELL = [
  './focus-pet.html',
  './manifest.json',
  './icon.png',
];

// Audio files — cached on first fetch
const AUDIO = [
  './assets/audio/music/start.mp3',
  './assets/audio/music/pause.mp3',
  './assets/audio/music/stop.mp3',
  './assets/audio/music/complete.mp3',
  './assets/audio/music/break.mp3',
  './assets/audio/music/combo.mp3',
  './assets/audio/music/exp.mp3',
  './assets/audio/music/level up.mp3',
  './assets/audio/sfx/lofi.mp3',
  './assets/audio/sfx/rain.mp3',
  './assets/audio/sfx/Nature sounds.mp3',
];

/* ── Install: cache shell immediately ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean up old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch: cache-first for shell, stale-while-revalidate for audio ── */
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g. Google Fonts)
  if (!url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // Audio files: cache-first, fallback to network
  const isAudio = url.includes('/assets/audio/');
  if (isAudio) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
