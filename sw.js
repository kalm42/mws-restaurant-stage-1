const staticCacheName = 'mws-rs-v2'

self.addEventListener('install', e => {
  console.log(`🔨 ${staticCacheName} installing…`);
  e.waitUntil(
    caches.open(staticCacheName)
      .then(cache => (
        cache.addAll([
          '/',
          'css/styles.css',
          'js/dbhelper.js',
          'js/main.js',
          'js/restaurant_info.js',
          'img/1.jpg',
          'img/2.jpg',
          'img/3.jpg',
          'img/4.jpg',
          'img/5.jpg',
          'img/6.jpg',
          'img/7.jpg',
          'img/8.jpg',
          'img/9.jpg',
          'img/10.jpg',
        ])
      ))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => (
      Promise.all(
        cacheNames.filter((cacheName) => (
          cacheName !== staticCacheName
        )).map((cacheName) => (
          caches.delete(cacheName)
        ))
      )
    ))
  );
});

self.addEventListener('fetch', (event) => {
  // If the request is not supposed to be cached, then just pull it.
  // Commented out at the request of the reviewer
  // if (event.request.cache != 'default') {
  //   console.log('Skip caching');
  //   return fetch(event.request);
  // }
  // event.respondWith(
  //   // Open the cache to add a fetched resource
  //   caches.open(staticCacheName)
  //     .then(cache => cache.match(event.request)
  //       // if the response is undefined it will go with the fetch
  //       .then(response => response || fetch(event.request)
  //         .then((response) => {
  //           // cache the fetched resource
  //           cache.put(event.request, response.clone());
  //           return response;
  //         })))
  // );
  event.respondWith(
    caches.match(event.request)
      .then((res) => {
        // Cache response found, return it
        if (res) {
          return res;
        }

        // No cache response found, fetch it.
        const fetchReq = event.request.clone();
        return fetch(fetchReq)
          .then((res) => {
            // If there's no response, or it's not a good response or the response isn't 'basic'
            if (!res || res.status !== 200 || res.type !== 'basic') {
              return res;
            }

            // Cache the res
            const cacheRes = res.clone();
            caches.open(staticCacheName)
              .then((cache) => {
                cache.put(event.request, cacheRes)
              });

            return res;
          });
      })
  );
});