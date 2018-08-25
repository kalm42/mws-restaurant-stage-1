import idb from "idb";

const IDB_NAME = "restaurantsAndReviewsStore";
const RESTAURANTS = "restaurants";
const REVIEWS = "reviews";
const UNRESOLVED = "unresolved";

/**
 * Will act as local copy of database. Manages all communication between ui and
 * indexedDB. Sits between ui and database server.
 */

/**
 * Helper variable returning a promise for indexedDB.
 */
const idbPromise = idb.open(IDB_NAME, 3, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB
        .createObjectStore(RESTAURANTS, { keyPath: "id" })
        .createIndex("is_favorite", "is_favorite");
    case 1:
      upgradeDB
        .createObjectStore(REVIEWS, { keyPath: "id" })
        .createIndex("restaurant_id", "restaurant_id");
    case 2:
      upgradeDB.createObjectStore("unresolved", {
        keyPath: "id",
        autoIncrement: true
      });
  }
});

/*******************************************************************************
 * Reviews
 */

/**
 * Get review by id
 */
module.exports.getReview = id =>
  idbPromise.then(objStore =>
    objStore
      .transaction(REVIEWS)
      .objectStore(REVIEWS)
      .get(id)
  );
/**
 * Get all reviews for a specific restaurant
 */
module.exports.getReviews = restaurant_id =>
  idbPromise.then(objStore =>
    objStore
      .transaction(REVIEWS)
      .objectStore(REVIEWS)
      .index("restaurant_id")
      .getAll(restaurant_id)
  );
/**
 * Get all reviews 
 */
module.exports.getAllReviews = () =>
  idbPromise.then(objStore =>
    objStore
      .transaction(REVIEWS)
      .objectStore(REVIEWS)
      .getAll()
  );

/**
 * Saves a new review for a restaurant.
 * @param {array[object]} reviews
 */
module.exports.addReview = review =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(REVIEWS, "readwrite")
      .objectStore(REVIEWS);
    review.id = Date.now();
    store.add(review);
    return review;
  });

/**
 * Saves reviews from fetch
 * @param {array[object]} reviews
 */
module.exports.addReviews = reviews =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(REVIEWS, "readwrite")
      .objectStore(REVIEWS);
    reviews.map(review => {
      store.put(review);
    });
    return reviews;
  });

/**
 * Updates a review
 * @param {*} review
 */
module.exports.updateReview = review =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(REVIEWS, "readwrite")
      .objectStore(REVIEWS);
    store.put(review, review.id);
    return review;
  });

/**
 * Delete a review
 * @param {*} review
 */
module.exports.deleteReview = review =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(REVIEWS, "readwrite")
      .objectStore(REVIEWS);
    store.delete(review.id);
    return review;
  });

/*******************************************************************************
 * Restaurants
 */
module.exports.getRestaurants = () =>
  idbPromise.then(objStore =>
    objStore
      .transaction(RESTAURANTS)
      .objectStore(RESTAURANTS)
      .getAll()
  );

module.exports.getRestaurantById = id =>
  idbPromise.then(objStore =>
    objStore
      .transaction(RESTAURANTS)
      .objectStore(RESTAURANTS)
      .get(id)
  );

module.exports.getFavoriteRestaurant = () =>
  idbPromise.then(objStore =>
    objStore
      .transaction(RESTAURANTS)
      .objectStore(RESTAURANTS)
      .index("is_favorite")
      .get("true")
  );

module.exports.addRestaurants = new_restaurants =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(RESTAURANTS, "readwrite")
      .objectStore(RESTAURANTS);
    console.log("New restaurants: ", new_restaurants);

    new_restaurants.map(restaurant => {
      store.put(restaurant);
    });
    return new_restaurants;
  });

/**
 * Unresolved - reviews that failed to post to server
 * ```
 * method,
 * url,
 * body
 * ```
 */
// add unresolved review
module.exports.addUnresolvedReview = review =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(UNRESOLVED, "readwrite")
      .objectStore(UNRESOLVED);
    store.add(review);
    return review;
  });
// attempt to post reviews
const next = () => updateReviews();
const updateReviews = next =>
  idbPromise.then(objStore => {
    const url = "http://localhost:1337/reviews";
    const method = "POST";
    const store = objStore
      .transaction(UNRESOLVED, "readwrite")
      .objectStore(UNRESOLVED);
    store.openCursor().then(cursor => {
      if (!cursor) return;
      // Validate cursor
      const review = cursor.value;
      const properties = {
        method,
        body: JSON.stringify(review)
      };

      // Now attempt to post the review
      fetch(url, properties)
        .then(res => {
          // If there was a problem posting the review skip to next.
          if (!res.ok && res.status !== 201) return;
        })
        .then(() => {
          // remove posted review
          cursor
            .delete()
            .then(() => {
              next();
            })
            .catch(err => {
              console.log(
                "❗💩 there was an error deleting the posted review from indexedDB.\nError: ",
                err
              );
              return;
            });
        })
        .catch(err => {
          console.log(
            "❗💩 there was an error posting the review to the server.\nError: ",
            err
          );
          return;
        });
    });
  });
