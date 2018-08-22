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
  switch (key) {
    case 0:
      upgradeDB.createObjectStore(RESTAURANTS, { keyPath: "id" });
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

/**
 * Returns a read only object store for reviews.
 */
const reviewObjectStore = () =>
  idbPromise.then(objStore =>
    objStore.transaction(REVIEWS).objectStore(REVIEWS)
  );

/**
 * Returns a read/write object store for reviews.
 */
const reviewObjectStoreWithReadWrite = async () =>
  await idbPromise.then(objStore =>
    objStore.transaction(REVIEWS, "readwrite").objectStore(REVIEWS)
  );

/**
 * Reviews
 */

/**
 * Get all reviews for a specific restaurant
 */
module.exports.getReviewsForRestaurant = restaurant_id =>
  reviewObjectStore().then(objStore =>
    objStore
      .index("restaurant_id") // index we're searching
      // what are we searching for
      .getAll(restaurant_id)
  );

/**
 * Saves a new review for a restaurant.
 * @param {array[object]} reviews
 */
const addReviewForRestaurant = review =>
  reviewObjectStoreWithReadWrite().then(store => {
    store.add(review);
    return review;
  });

// Update a review
const updateReview = review =>
  reviewObjectStoreWithReadWrite().then(store => {
    store.put(review, review.id);
    return review;
  });
// Delete a review
const deleteReview = review =>
  reviewObjectStoreWithReadWrite().then(store => {
    store.delete(review.id);
    return review;
  });

/**
 * Restaurants
 */
const getRestaurants = () =>
  idbPromise.then(objStore =>
    objStore
      .transaction(RESTAURANTS)
      .objectStore(RESTAURANTS)
      .getAll()
  );

const getRestaurantById = id =>
  idbPromise.then(objStore =>
    objStore
      .transaction(RESTAURANTS)
      .objectStore(RESTAURANTS)
      .get(id)
  );

const setRestaurants = new_restaurants =>
  idbPromise.then(objStore => {
    const store = objStore
      .transaction(RESTAURANTS, "readwrite")
      .objectStore(RESTAURANTS);
    new_restaurants.map(restaurant => {
      store.add(restaurant);
    });
    return new_restaurants;
  });

/**
 * Unresolved - reviews that failed to post to server
 */
// add unresolved review
const addUnresolvedReview = review =>
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
