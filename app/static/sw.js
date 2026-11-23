// Shows the daily reminder. A push arrives without text; the worker asks the site what to say,
// so the numbers are current. It does nothing else: no caching, no offline mode.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
	event.waitUntil(
		(async () => {
			let title = 'Northstart';
			let body = 'Загляни в план: есть задачи на сегодня.';
			try {
				const res = await fetch('/reminder/text', { headers: { accept: 'application/json' } });
				if (res.ok) {
					const data = await res.json();
					if (typeof data.title === 'string' && typeof data.body === 'string') ({ title, body } = data);
				}
			} catch {
				// Offline: the general text above is shown.
			}
			await self.registration.showNotification(title, { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'daily-reminder' });
		})()
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
			for (const w of windows) if ('focus' in w) return w.focus();
			return self.clients.openWindow('/');
		})
	);
});
