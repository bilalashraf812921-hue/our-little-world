/* Our Little World - minimal service worker.
   Only makes the app installable (so it can appear in the phone's Share menu). It does NOT cache anything,
   so GitHub updates always show up immediately. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* network as usual */ });
