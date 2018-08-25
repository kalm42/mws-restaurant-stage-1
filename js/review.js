import "@babel/polyfill";
import DBHelper from "./dbhelper";
import validator from "validator";

// Map
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) {
      // Got an error!
      console.log(error);
    } else {
      self.map = new google.maps.Map(document.getElementById("map"), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false,
        disableDefaultUI: true
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
      const form = document.getElementById("review");
      form.addEventListener("submit", handleFormSubmit);
    }
  });
};

window.addEventListener("load", event => {
  DBHelper.processPending();
});

const handleFormSubmit = e => {
  e.preventDefault();
  // Assume it's a new review unless proven otherwise.
  let isUpdate = false;

  // Things to keep
  const name = document.getElementById("name");
  const rating = document.getElementById("rating");
  const comments = document.getElementById("comment");
  const restaurant_id = Number(getParameterByName("restaurant_id"));
  const review_id = Number(getParameterByName("id"));
  if (review_id) isUpdate = true;

  // Clear any previous errors.
  const errors = document.getElementById("errors");
  if (errors) {
    errors.remove();
    name.removeAttribute("class");
    rating.removeAttribute("class");
    comments.removeAttribute("class");
  }

  console.log("Review ID: ", review_id);

  // Assemble the review object for saving.
  const review = {
    name: name.value,
    restaurant_id: restaurant_id,
    rating: Number(rating.value),
    comments: comments.value
  };

  // Check if this is an update if yes, then add the id to the object.
  if (isUpdate) {
    review.id = self.review.id;
    review.createdAt = self.review.createdAt;
    review.updatedAt = Date.now();
  }
  console.log("The Review: ", review);

  // Validate the form
  const isValid = validateForm();

  // If valid post/update review.
  if (isValid) {
    if (isUpdate) {
      DBHelper.updateReview(review, (err, review) => {
        //   Do things
        gotoRestaurantDetails();
      });
    } else {
      DBHelper.addReview(review, (err, review) => {
        if (err && !review) {
          // Everything failed.
          console.log("Review post error: ", err);
          // TODO: Update user that shit failed and they should try again.
          return;
        }
        // If everything didn't fail we can go back to the restaurant details.
        gotoRestaurantDetails();
      });
    }
  }
};

const gotoRestaurantDetails = () => {
  const restaurant_id = getParameterByName("restaurant_id");
  const path = `restaurant.html?id=${restaurant_id}#restaurant-container`;
  window.location.href = `/${path}`;
};

const validateForm = () => {
  // Errors will be an array of mistakes to correct.
  let errors = [];
  const name = document.getElementById("name").value;
  const rating = document.getElementById("rating").value;
  const comments = document.getElementById("comment").value;
  // name min:1, max: 25, must be alpha, no numbers.
  if (!validator.isLength(name, { min: 1, max: 25 })) {
    errors.push(
      `Name must be between 1 and 25 characters. You entered ${name.length}`
    );
    name.setAttribute("class", "form-input-fail");
  }
  if (!validator.isAlpha(name)) {
    errors.push(
      "Name must be only letters A-Z, a-z. No numbers or special characters."
    );
    name.setAttribute("class", "form-input-fail");
  }
  // rating only whole integer, min 1, max 5;
  if (!validator.isInt(rating, { min: 1, max: 5 })) {
    errors.push("Rating must be a whole number between 1 and 5.");
    rating.setAttribute("class", "form-input-fail");
  }
  // comments. min: 1, max: 140;
  if (!validator.isLength(comments, { min: 10, max: 140 })) {
    errors.push(
      `Your comment must be between 10 and 140 characters. You have ${
        comments.length
      } characters.`
    );
    comments.setAttribute("class", "form-input-fail");
  }
  // Prompt the user to correct errors.
  if (errors.length > 0) {
    const container = document.getElementById("reviews-container");
    const list = document.createElement("ul");
    list.setAttribute("id", "errors");
    container.appendChild(list);

    // Add the errors.
    errors.map(error => {
      const li = document.createElement("li");
      li.innerHTML = error;
      list.appendChild(li);
    });
    return false;
  }
  return true;
};

/**
 * pulls the value of url queries by name
 * @param {string} name
 */
const getParameterByName = name => {
  const url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};

/**
 * Add the html for the restaurant
 * @param {object} restaurant
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById("restaurant-name");
  name.innerHTML = restaurant.name;

  const address = document.getElementById("restaurant-address");
  address.innerHTML = restaurant.address;

  const image = document.getElementById("restaurant-img");
  image.className = "restaurant-img";
  image.alt = restaurant.name;
  image.src = DBHelper.imageUrlForRestaurant(restaurant);

  const cuisine = document.getElementById("restaurant-cuisine");
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
};

/**
 * Add the restaurant's hours to the dom
 * @param {object} operatingHours
 */
const fillRestaurantHoursHTML = (
  operatingHours = self.restaurant.operating_hours
) => {
  const hours = document.getElementById("restaurant-hours");
  for (let key in operatingHours) {
    const row = document.createElement("tr");

    const day = document.createElement("td");
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement("td");
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Fetches the restaurant Information and calls the HTML creation functions
 * @param {error, object} callback
 */
const fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName("restaurant_id");
  if (!id) {
    // no id found in URL
    const error = new Error("No restaurant id in URL");
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML(restaurant);
      callback(null, restaurant);
    });
  }

  const reviewId = getParameterByName("id");
  if (reviewId) {
    console.log("Review ID: ", reviewId);

    DBHelper.getReviewById(Number(reviewId), (err, review) => {
      if (err) {
        // fetch failed, inform user comments can only be edited while online.
        console.log("Review fetch failed.", err);
        return;
      }
      console.log("Returned review: ", review);

      self.review = review;
      const name = document.getElementById("name");
      const rating = document.getElementById("rating");
      const comments = document.getElementById("comment");
      name.value = review.name;
      rating.value = review.rating;
      comments.value = review.comments;

      // Add delete button
      // const form = document.getElementById("review");
      const form = document.getElementById("buttons");
      const deleteButton = document.createElement("button");
      deleteButton.setAttribute("class", "button");
      deleteButton.style.background = "#f23c55";
      deleteButton.innerHTML = "delete";
      deleteButton.onclick = deleteReview;
      form.appendChild(deleteButton);
    });
  }
};

const deleteReview = e => {
  e.preventDefault(); // Don't submit the form.

  const confirmed = window.confirm(
    "Are you sure you want to delete this review?"
  );
  console.log("Review to delete: ", self.review);

  if (confirmed && self.review) {
    DBHelper.deleteReview(self.review, (err, review) => {
      if (err && !review) {
        return;
      }
      gotoRestaurantDetails();
    });
  }
};

/**
 * Fill in the breadcrumb html.
 * @param {object} restaurant
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById("breadcrumb");
  const restaurant_id = getParameterByName("restaurant_id");
  const path = `restaurant.html?id=${restaurant_id}#restaurant-container`;
  const a = document.createElement("a");
  a.href = path;
  a.innerHTML = restaurant.name;
  const rest = document.createElement("li");
  rest.appendChild(a);
  breadcrumb.appendChild(rest);
  const li = document.createElement("li");
  li.innerHTML = "Review Form";
  breadcrumb.appendChild(li);
};
