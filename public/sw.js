// This is a basic service worker file for PWA installability.
// It can be expanded later for offline caching and other features.

self.addEventListener('install', (event) => {
  // Perform install steps
  console.log('Service Worker installing.');
});

self.addEventListener('fetch', (event) => {
  // This simple service worker doesn't intercept fetch requests.
  // It's just here to make the app installable.
  event.respondWith(fetch(event.request));
});
