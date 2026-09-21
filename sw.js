"use strict";

// Bump this version whenever a deployed application file changes.
const CACHE_PREFIX = "planetarium-op-";
const CACHE_NAME = CACHE_PREFIX + "v5";
const ROOT = new URL("./", self.location.href);
const SHELL = ["./", "./index.html", "./install.js", "./manifest.webmanifest",
  "./icons/dome.svg", "./icons/icon-192.png", "./icons/icon-512.png",
  ...Array.from({ length: 17 }, (_, i) => "./images/reference-" + String(i + 1).padStart(2, "0") + ".webp")];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>
    cache.addAll(SHELL.map((path) => new Request(new URL(path, ROOT), { cache: "reload" })))
  ).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(new URL("index.html", ROOT).href)));
    return;
  }

  // Prefer edited image files online; retain the last successful version for offline use.
  if (/\/images\/[a-zA-Z0-9_-]+\.(?:webp|png)$/.test(url.pathname)) {
    const response = fetch(new Request(event.request, { cache: "no-cache" })).then(async (fresh) => {
      if (!fresh.ok) return (await caches.match(event.request)) || fresh;
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, fresh.clone());
      } catch { /* An unavailable cache must not hide an online picture. */ }
      return fresh;
    }).catch(async () => (await caches.match(event.request)) || Response.error());
    event.respondWith(response);
    return;
  }

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
