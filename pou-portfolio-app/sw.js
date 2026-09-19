/* Pou Portfolio service worker.
 * Keeps the app working without signal. It caches only the app's own files;
 * nothing a nurse types ever passes through it (entries live in the browser's
 * local storage). Bump VERSION when the app files change so old copies are
 * cleared. */
'use strict';

var VERSION = 'pou-portfolio-v1';
var INDEX = new URL('index.html', self.location).href;
var ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'fonts/bricolage-grotesque-latin-600-normal.woff2',
  'fonts/bricolage-grotesque-latin-700-normal.woff2',
  'fonts/bricolage-grotesque-latin-ext-600-normal.woff2',
  'fonts/bricolage-grotesque-latin-ext-700-normal.woff2',
  'fonts/source-sans-3-latin-400-normal.woff2',
  'fonts/source-sans-3-latin-600-normal.woff2',
  'fonts/source-sans-3-latin-700-normal.woff2',
  'fonts/source-sans-3-latin-ext-400-normal.woff2',
  'fonts/source-sans-3-latin-ext-600-normal.woff2',
  'fonts/source-sans-3-latin-ext-700-normal.woff2'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Serve from the cache straight away, and refresh the cached copy in the
// background so the next launch has the latest version.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // The whole app is one page, so every navigation gets index.html.
    var updateIndex = fetch(INDEX, { cache: 'no-cache' }).then(function (res) {
      if (!res || !res.ok) return res;
      var copy = res.clone();
      return caches.open(VERSION).then(function (c) { return c.put(INDEX, copy); }).then(function () { return res; });
    }).catch(function () { return null; });
    event.waitUntil(updateIndex);
    event.respondWith(
      caches.match(INDEX).then(function (cached) {
        if (cached) return cached;
        return updateIndex.then(function (res) { return res || new Response('The app is not available offline yet. Open it once with a connection.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }); });
      })
    );
    return;
  }

  var update = fetch(req).then(function (res) {
    if (res && res.ok) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () { return null; });
  event.waitUntil(update);
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return update.then(function (res) { return res || new Response('', { status: 504 }); });
    })
  );
});
