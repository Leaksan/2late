// Kill-switch PWA : ce fichier remplace l'ancien service worker Workbox
// (la version Flask du frontend n'utilise plus de service worker).
// Quand un ancien SW télécharge cette mise à jour, il s'installe, vide tous
// les caches, se désinstalle et recharge les pages ouvertes — l'app est
// ensuite toujours servie depuis le réseau.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
