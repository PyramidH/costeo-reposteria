/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;
const CACHE = `costeo-${version}`;
const ASSETS = [...build, ...files];

sw.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;
	const url = new URL(event.request.url);
	if (url.origin !== location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// Assets inmutables: caché primero.
			if (ASSETS.includes(url.pathname)) {
				const hit = await cache.match(url.pathname);
				if (hit) return hit;
			}
			// Navegación y resto: red primero, caché como respaldo offline.
			try {
				const res = await fetch(event.request);
				if (res.ok) cache.put(event.request, res.clone());
				return res;
			} catch {
				const hit = await cache.match(event.request);
				if (hit) return hit;
				if (event.request.mode === 'navigate') {
					const fallback = await cache.match('/index.html');
					if (fallback) return fallback;
				}
				throw new Error('offline');
			}
		})()
	);
});
