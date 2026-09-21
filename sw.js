"use strict";

// Bump this version whenever a deployed application file changes.
const CACHE_PREFIX = "planetarium-op-";
const CACHE_NAME = CACHE_PREFIX + "v1";
const ROOT = new URL("./", self.location.href);
const SHELL = ["./", "./index.html", "./install.js", "./manifest.webmanifest",
  "./icons/dome.svg", "./icons/icon-192.png", "./icons/icon-512.png"];

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

  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
