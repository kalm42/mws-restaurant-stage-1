const staticCacheName = "mws-rs-v10";

self.addEventListener("install", e => {
  console.log(`🔨 ${staticCacheName} installing…`);
  e.waitUntil(
    caches
      .open(staticCacheName)
      .then(cache =>
        cache.addAll([
          "/",
          "css/styles.css",
          "js/dbhelper.js",
          "js/main.js",
          "js/restaurant_info.js",
          "js/idbhelper.js",
          "img/1.jpg",
          "img/2.jpg",
          "img/3.jpg",
          "img/4.jpg",
          "img/5.jpg",
          "img/6.jpg",
          "img/7.jpg",
          "img/8.jpg",
          "img/9.jpg",
          "img/10.jpg",
          "img/404.jpg",
          "index.html",
          "restaurant.html"
        ])
      )
  );
});

// self.addEventListener("activate", e => {
//   e.waitUntil(
//     caches
//       .keys()
//       .then(cacheNames =>
//         Promise.all(
//           cacheNames
//             .filter(cacheName => cacheName !== staticCacheName)
//             .map(cacheName => caches.delete(cacheName))
//         )
//       )
//   );
// });

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      // Cache response found, return it
      if (res) {
        return res;
      }

      // No cache response found, fetch it.
      const fetchReq = event.request.clone();
      return fetch(fetchReq).then(res => {
        // If there's no response, or it's not a good response or the response isn't 'basic'
        if (!res || res.status !== 200 || res.type !== "basic") {
          return res;
        }

        // Cache the res
        const cacheRes = res.clone();
        caches.open(staticCacheName).then(cache => {
          cache.put(event.request, cacheRes);
        });

        return res;
      });
    })
  );
});
