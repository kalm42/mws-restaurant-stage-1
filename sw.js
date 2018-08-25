import idbhelper from "./js/idbhelper";
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
          "js/idbhelper.js",
          "js/main.js",
          "js/restaurant_info.js",
          "js/swregistrar.js",
          "index.html",
          "restaurant.html",
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
          "img/404.jpg"
        ])
      )
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches
      .keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== staticCacheName)
            .map(cacheName => caches.delete(cacheName))
        )
      )
  );
});

self.addEventListener("fetch", event => {
  // Only cache GET requests.
  if (event.request.method !== "GET") {
    event.respondWith(fetch(event.request));
    return;
  }

  // Check if url is for our api.
  const eventUrl = new URL(event.request.url);
  if (eventUrl.port === "1337") {
    // it is an api request.
    // is it a restaurant request or a review request
    if (
      eventUrl.pathname.split("/").filter(path => path === "restaurants")
        .length > 0
    ) {
      // Is a restaurant request.
      handleRestaurantRequest(event);
      return;
    } else {
      // is a review request
      handleReviewRequest(event);
      return;
    }
  }

  event.respondWith(
    caches.match(event.request).then(res => {
      // Cache response found, return it
      if (res) {
        return res;
      }

      // Is a get request, is not for our api, and is not currently in cache.
      const fetchReq = event.request.clone();
      return fetch(fetchReq).then(res => {
        // If there's no response, or it's not a good response or the response isn't 'basic'
        if (!res || res.status !== 200 || res.type !== "basic") {
          return res;
        }

        // Cache the response
        const cacheRes = res.clone();
        caches.open(staticCacheName).then(cache => {
          cache.put(event.request, cacheRes);
        });

        return res;
      });
    })
  );
});

const sort = reviewArray => {
  return reviewArray.sort((a, b) => {
    if (a.updatedAt > b.updatedAt) {
      return -1;
    }
    if (a.updatedAt < b.updatedAt) {
      return 1;
    }
    return 0;
  });
};

const handleRestaurantRequest = event => {
  const eventUrl = new URL(event.request.url);

  // Is favorite request?
  if (eventUrl.searchParams.get("is_favorite")) {
    // Get favorites http://localhost:1337/restaurants/?is_favorite=true
    getFavoriteRestaurant(event);
    return;
  }

  // Search by id?
  if (
    eventUrl.pathname.split("/").filter(path => Number(path) > 0).length > 0
  ) {
    // Get by id http://localhost:1337/restaurants/1
    let id = eventUrl.pathname.split("/").filter(path => Number(path) > 0);
    id = Number(id[0]);
    getRestaurantById(event, id);
    return;
  }

  // Get all http://localhost:1337/restaurants
  getRestaurants(event);
};

const getRestaurants = event => {
  event.respondWith(
    idbhelper.getRestaurants().then(data => {
      // See if data was returned.
      if (data.length > 0) {
        return new Response(JSON.stringify(data));
      }

      // No data, go fish.
      return fetchAndCacheRestaurants(event).then(json => {
        return new Response(JSON.stringify(json));
      });
    })
  );
};

const getFavoriteRestaurant = event => {
  event.respondWith(
    idbhelper.getFavoriteRestaurant().then(data => {
      // See if data was returned.
      if (data.length > 0) {
        return new Response(JSON.stringify(data));
      }

      // No data, go fish.
      return fetchAndCacheRestaurants(event).then(json => {
        return new Response(JSON.stringify(json));
      });
    })
  );
};

const getRestaurantById = (event, id) => {
  event.respondWith(
    idbhelper.getRestaurantById(id).then(data => {
      // See if data was returned.
      if (
        data &&
        Object.keys(data).length !== 0 &&
        data.constructor === Object
      ) {
        return new Response(JSON.stringify(data));
      }

      // No data, go fish.
      return fetchAndCacheRestaurants(event).then(json => {
        return new Response(JSON.stringify(json));
      });
    })
  );
};

const fetchAndCacheRestaurants = event =>
  // Fetch and cache.
  fetch(event.request)
    .then(res => res.json())
    .then(json => {
      if (!Array.isArray(json)) {
        idbhelper.addRestaurants([json]);
      } else {
        idbhelper.addRestaurants(json);
      }
      return json;
    });

const handleReviewRequest = event => {
  const eventUrl = new URL(event.request.url);
  console.log("review request url", eventUrl);

  // get review by id
  if (eventUrl.pathname.split("/").filter(path => Number(path) > 0).length > 0) {
    console.log("FEtching a specific review");

    let id = eventUrl.pathname.split("/").filter(path => Number(path) > 0);
    id = Number(id[0]);
    console.log("Review ID: ", id);

    event.respondWith(
      // Must be fetched, we need the id from the api to properly update.
      fetchAndCacheReviews(event).then(json => {
        return new Response(JSON.stringify(json));
      })
    );
    return;
  }
  // get review for specific restaurant
  if (eventUrl.searchParams.get("restaurant_id")) {
    let id = eventUrl.searchParams.get("restaurant_id");
    id = Number(id[0]);

    event.respondWith(
      idbhelper.getReviews(id).then(data => {
        // See if data was returned.
        if (data.length > 0) {
          return new Response(JSON.stringify(sort(data)));
        }

        // No data, go fish.
        return fetchAndCacheReviews(event).then(json => {
          return new Response(JSON.stringify(sort(json)));
        });
      })
    );
    return;
  }

  event.respondWith(
    idbhelper.getAllReviews().then(data => {
      // See if data was returned.
      if (data.length > 0) {
        return new Response(JSON.stringify(sort(data)));
      }

      // No data, go fish.
      return fetchAndCacheReviews(event).then(json => {
        return new Response(JSON.stringify(sort(json)));
      });
    })
  );
};

const fetchAndCacheReviews = event =>
  fetch(event.request)
    .then(res => res.json())
    .then(json => {
      if (!Array.isArray(json)) {
        idbhelper.addReviews([json]);
      } else {
        idbhelper.addReviews(json);
      }
      return json;
    });
