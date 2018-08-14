/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * 
   */
  static get DATABASE_NAME() {
    return 'restaurant_reviews';
  }

  static get OBJECT_STORE() {
    return 'restaurants'
  }

  static get IDB_VERSION() {
    return 1;
  }

  /**
   * Store restaurants in IndexedDB
   */
  static setRestaurants(data) {
    // Put the restaurants into the indexedDB
    const req = window.indexedDB.open(DBHelper.DATABASE_NAME, DBHelper.IDB_VERSION)

    req.onupgradeneeded = function (event) {
      const db = event.target.result;
      console.log("database: ", db);

      const objectStore = db.createObjectStore("restaurants", { keyPath: 'id' })

      objectStore.transaction.oncomplete = function (event) {
        const restaurantObjectStore = db.transaction("restaurants", "readwrite").objectStore("restaurants");
        data.map((restaurant) => {
          restaurantObjectStore.add(restaurant)
        })
      }
    }
  }

  /**
   * Retrieve restaurants from indexedDB
   */
  static getRestaurants() {
    console.log("Attempting to fetch from indexedDB.");
    let result;
    const req = window.indexedDB.open(DBHelper.DATABASE_NAME, DBHelper.IDB_VERSION)
    req.transaction("restaurants").objectStore("restaurants").getAll().onsuccess = function (event) {
      console.log("😲", event.target.result);
      result = event.target.result;
    }
    return result;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    let db;

    fetch(DBHelper.DATABASE_URL)
      .then((res) => {
        console.log("Response: ", res);

        if (res.ok) {
          return res.json();
        }
        // throw new Error(`Nework response was ${res.status}`);
      })
      .then((json) => {
        if (json.length > 0) {
          // Take the restaurants and add them to indexedDB.
          DBHelper.setRestaurants(json);
          callback(null, json);
        }
        // throw new Error('Database response did not include any restaurants.');
      })
      .catch((err) => {
        const req = window.indexedDB.open(DBHelper.DATABASE_NAME, DBHelper.IDB_VERSION)
        const res = req.onsuccess = function () {
          db = req.result;
          db.transaction("restaurants").objectStore("restaurants").getAll().onsuccess = function (event) {
            callback(null, event.target.result);
            // throw new Error(err);
          }
        }
      })
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    let db;
    // fetch all restaurants with proper error handling.
    fetch(`${DBHelper.DATABASE_URL}/${id}`)
      .then((res) => {
        if (res && res.ok) {
          return res.json();
        }
      })
      .then((json) => {
        if (json.hasOwnProperty('neighborhood')) {
          callback(null, json);
        }
        throw new Error('Database response did not include any restaurants.');
      })
      .catch((err) => {
        const req = window.indexedDB.open(DBHelper.DATABASE_NAME, DBHelper.IDB_VERSION)
        const res = req.onsuccess = function () {
          db = req.result;
          db.transaction("restaurants").objectStore("restaurants").getAll().onsuccess = function (event) {
            callback(null, event.target.result[id]);
            // throw new Error(err);
          }
        }
        // throw new Error(err);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph || '404'}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    }
    );
    return marker;
  }

}

