// Service Worker for Publicador24 PWA
const CACHE_NAME = "publicador24-v1";
const CACHE_URLS = [
  "/",
  "/dashboard",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
