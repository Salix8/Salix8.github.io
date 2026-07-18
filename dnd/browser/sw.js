"use strict";

self.addEventListener("install", event => {
	self.skipWaiting();
	event.waitUntil((async () => {
		if (!self.caches) return;
		const cacheNames = await caches.keys();
		await Promise.all(cacheNames.map(name => caches.delete(name)));
	})());
});

self.addEventListener("activate", event => {
	event.waitUntil((async () => {
		if (!self.caches) return;
		const cacheNames = await caches.keys();
		await Promise.all(cacheNames.map(name => caches.delete(name)));
		await self.registration.unregister();
		if (self.clients && clients.claim) await clients.claim();
	})());
});

self.addEventListener("fetch", () => {});
