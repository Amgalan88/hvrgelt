// hvrgelt — Push notification service worker.
// Зөвхөн push мэдэгдэл харуулах зорилготой (offline cache хийхгүй).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "hvrgelt.mn", body: "Захиалгын шинэчлэлт байна." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      badge: "/favicon.svg",
      data: { orderId: data.orderId ?? null, url: data.url ?? "/" },
      tag: data.orderId ? `order-${data.orderId}` : undefined,
    })
  );
});

// Мэдэгдэл дээр дарахад апп руу буцаах / фокуслах
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
