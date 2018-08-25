import validator from "validator";
import idbhelper from "./idbhelper";
import { resolve } from "dns";
/**
 * DB Helper means to me that it provides data information to the client. It
 * should provide data from indexedDB first for a faster response time then
 * if that fails check the backend server for information updating indexeddb
 * and the client ui.
 */
class DBHelper {
  /*****************************************************************************
   * Helper functions
   */
  /**
   * Restaurant databalse url.
   */
  static get RESTAURANT_DB_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Review database url.
   */
  static get REVIEW_DB_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return `./restaurant.html?id=${restaurant.id}`;
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return `/img/${restaurant.photograph || 404}.jpg`;
  }

  /**
   * Helper method for validating review objects.
   * @param {object} review
   */
  static isValidReview(review) {
    // Validate review object structure.
    // ```
    // {
    //     "restaurant_id": <restaurant_id>,
    //     "name": <reviewer_name>,
    //     "rating": <rating>,
    //     "comments": <comment_text>
    // }
    // ```
    let isValid = true;
    if (
      !review ||
      !Number.isInteger(Number(review.restaurant_id)) ||
      !Number.isInteger(Number(review.rating)) ||
      !(review.rating > 0 && review.rating < 6) ||
      !validator.isAlpha(review.name) ||
      !validator.isLength(review.comments, { min: 1, max: 140 })
    ) {
      isValid = false;
    }
    return isValid;
  }

  /**
   * Helper method for making asyncronous get requests.
   */
  static goGet(url = "", errorMessage = "Error: ") {
    if (url.length < 7) {
      return new Promise((resolve, reject) => {
        reject(`Url: ${url} is invalid.`);
      });
    }

    return fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .catch(err => {
        console.log(errorMessage, err);
        return err;
      });
  }

  /**
   * Helper method for making asyncronous post requests.
   * Method insipired by https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#Supplying_request_options
   */
  static goPost(url = "", data = {}, errorMessage = "Error: ") {
    if (url.length < 7 || Object.keys(data).length === 0) {
      console.log("Post url failed.", url, data);
      return new Promise((resolve, reject) => {
        if (url.length > 7) {
          reject(`Url provided ${url}, is invalid`);
        } else {
          reject(`Provided an empty object to post.`);
        }
      });
    }
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(data)
    })
      .then(res => {
        if (!res.ok || res.status > 300) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .catch(err => {
        console.log(errorMessage, err);
        return err;
      });
  }

  /**
   * Helper method for making asyncronous put requests.
   */
  static goPut(url = "", data = {}, errorMessage = "Error: ") {
    if (url.length > 7) return;
    return fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(data)
    })
      .then(res => {
        if (!res.ok || res.status > 300) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .catch(err => {
        console.log(errorMessage, err);
        return err;
      });
  }

  /**
   * Helper method for making asyncronous delete requests.
   */
  static goDelete(url = "", errorMessage = "Error: ") {
    if (url.length > 7) return;
    return fetch(url, {
      method: "DELETE"
    })
      .then(res => {
        if (!res.ok || res.status > 300) {
          throw new Error(res.statusText);
        }
        return res.json();
      })
      .catch(err => {
        console.log(errorMessage, err);
        return err;
      });
  }

  /*****************************************************************************
   * Review Functions
   */

  /**
   * Fetch the reviews for a specific restaurant
   * @param {number} id
   */
  static getReviewsByRestaurant(id, callback) {
    // Validate the id
    if (!Number.isInteger(Number(id))) {
      // If the id is invalid return with error.
      callback(new Error(`ID: ${id} is not a valid id.`), null);
    }

    // Fetch the review from the server.
    DBHelper.goGet(
      `${DBHelper.REVIEW_DB_URL}/?restaurant_id=${id}`,
      "❗💩 Error fetching reviews for restaurant: "
    )
      .then(reviews => {
        callback(null, reviews);
      })
      .catch(err => {
        callback(err, null);
      });
  }

  /**
   * Fetch all reviews from the server
   */
  static getAllReviews() {
    return DBHelper.goGet(
      DBHelper.REVIEW_DB_URL,
      "❗💩 Error fetching all reviews."
    );
  }

  /**
   * Fetch a specific review from the server
   * @param {number} id
   */
  static getReviewById(id, callback) {
    if (!Number.isInteger(Number(id))) return;

    DBHelper.goGet(
      `${DBHelper.REVIEW_DB_URL}/${id}`,
      "❗💩 Error fetching review: "
    ).then(res => {
      if (!res.ok) {
        callback(new Error("failed to retrieve review"), null);
      }
      callback(null, res);
    });
  }

  /**
   * Post a new review to the server
   * @param {object} review
   */
  static addReview(review, callback) {
    if (!DBHelper.isValidReview(review)) {
      console.log("Review failed validation: ", review);
      callback(new Error(`Review: ${review} is invalid`), null);
      return;
    }

    // Escape name and comments
    review.name = validator.escape(review.name);
    review.comments = validator.escape(review.comments);
    const idbReview = {
      ...review,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Add review to indexedDB
    idbhelper
      .addReview(idbReview)
      .then(storedReview => {
        // Add review to external server
        DBHelper.goPost(
          DBHelper.REVIEW_DB_URL,
          review,
          "❗💩 Error posting review: "
        ).then(res => {
          if (!res.ok) {
            const pendingReview = {
              foreignKey: storedReview.id,
              foreignStore: "reviews",
              method: "POST",
              url: DBHelper.REVIEW_DB_URL,
              body: review
            };
            idbhelper.addPending(pendingReview).then(pending => {
              callback(pending, res);
            });
          }
          // good.
          callback(null, res);
        });
      })
      .catch(err => {
        // Failed to add to indexedDB just abort
        callback(err, null);
      });
  }

  /**
   * Update a review
   * @param {number} id
   * @param {object} review
   */
  static updateReview(id, review) {
    if (!Number.isInteger(Number(id))) return;
    if (!DBHelper.isValidReview(review)) return;

    // Escape name and comments
    review.name = validator.escape(review.name);
    review.comments = validator.escape(review.comments);

    return DBHelper.goPut(`${DBHelper.REVIEW_DB_URL}/${id}`, review);
  }

  /**
   * Delete a review
   * @param {number} id
   */
  static deleteReview(id) {
    if (!Number.isInteger(Number(id))) return;

    return DBHelper.goDelete(`${DBHelper.REVIEW_DB_URL}/${id}`);
  }

  /*****************************************************************************
   * Restaurant functions
   */

  /**
   * Get all of the available restaurants from the server.
   */
  static getAllRestaurants() {
    return DBHelper.goGet(
      DBHelper.RESTAURANT_DB_URL,
      "❗💩 Error fetching all restaurants: "
    );
  }

  /**
   * Get all of the user's favorited restaurants.
   */
  static getFavoriteRestaurants() {
    return DBHelper.goGet(
      `${DBHelper.RESTAURANT_DB_URL}/?is_favorite=true`,
      "❗💩 Error fetching favorite restaurants: "
    );
  }

  /**
   * Fetch restaurant details for a specific restaurant from the server.
   * @param {number} id
   */
  static getRestaurantById(id) {
    if (!Number.isInteger(Number(id))) return;
    return DBHelper.goGet(
      `${DBHelper.RESTAURANT_DB_URL}/${id}`,
      "❗💩 Error fetching restaurant by id: "
    );
  }

  /**
   * Favorite a restaurant
   * @param {number} id
   */
  static setFavorite(id) {
    if (!Number.isInteger(Number(id))) return;
    return DBHelper.goPut(
      `${DBHelper.RESTAURANT_DB_URL}/${id}/?is_favorite=true`
    );
  }

  /**
   * Unfavorite a restaurant
   * @param {number} id
   */
  static unsetFavorite(id) {
    if (!Number.isInteger(Number(id))) return;
    return DBHelper.goPut(
      `${DBHelper.RESTAURANT_DB_URL}/${id}/?is_favorite=false`
    );
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    DBHelper.getAllRestaurants()
      .then(json => {
        callback(null, json);
      })
      .catch(err => {
        callback(err, null);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    DBHelper.getRestaurantById(id)
      .then(json => {
        callback(null, json);
      })
      .catch(err => {
        callback(err, null);
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
  static fetchRestaurantByCuisineAndNeighborhood(
    cuisine,
    neighborhood,
    callback
  ) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != "all") {
          // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != "all") {
          // filter by neighborhood
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
        const neighborhoods = restaurants.map(
          (v, i) => restaurants[i].neighborhood
        );
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter(
          (v, i) => neighborhoods.indexOf(v) == i
        );
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter(
          (v, i) => cuisines.indexOf(v) == i
        );
        callback(null, uniqueCuisines);
      }
    });
  }

  /*****************************************************************************
   * Map functions
   */

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
    });
    return marker;
  }

  /*****************************************************************************
   * Pending Functions
   */
  static async processPending() {
    await idbhelper.processPending();
  }
}

export default DBHelper;
