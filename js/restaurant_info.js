import DBHelper from "./dbhelper";
import moment from "moment";

let restaurant;
let reviews;
var newMap;

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
    }
  });
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = callback => {
  if (self.restaurant) {
    // restaurant already fetched!
    callback(null, self.restaurant);
    return;
  }
  const id = getParameterByName("id");
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
};

/**
 * Create restaurant HTML and add it to the webpage
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
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
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
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = () => {
  // Fetch the reviews
  DBHelper.fetchReviewsByRestaurant(self.restaurant.id, (error, reviews) => {
    if (error) return;

    // Make the html
    const container = document.getElementById("reviews-container");

    // Make header
    const header = document.createElement("section");
    header.setAttribute("class", "reviews-header");
    container.appendChild(header);

    // title
    const title = document.createElement("h3");
    title.innerHTML = "Reviews";
    header.appendChild(title);

    // New review button
    const addReviewBtn = document.createElement("a");
    addReviewBtn.href = `/review.html?restaurant_id=${self.restaurant.id}`;
    addReviewBtn.setAttribute("class", "button");
    addReviewBtn.innerHTML = "Add Review";
    header.appendChild(addReviewBtn);

    if (!reviews) {
      const noReviews = document.createElement("p");
      noReviews.innerHTML = "No reviews yet!";
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById("reviews-list");
    reviews.map(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  });
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = review => {
  const li = document.createElement("li");
  const reviewContainer = document.createElement("div");
  reviewContainer.className = "reviews-list-header";
  const name = document.createElement("p");
  name.className = "reviews-list-header-name";
  name.innerHTML = review.name;
  reviewContainer.appendChild(name);
  li.appendChild(reviewContainer);

  const date = document.createElement("p");
  date.className = "reviews-list-header-date";
  date.innerHTML = moment(review.updatedAt).fromNow();
  reviewContainer.appendChild(date);

  const rating = document.createElement("p");
  const ratingSpan = document.createElement("span");
  ratingSpan.className = "reviews-list-rating";
  ratingSpan.innerHTML = `Rating: ${review.rating}`;
  rating.appendChild(ratingSpan);
  li.appendChild(rating);

  const comments = document.createElement("p");
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  // New review button
  const editReviewBtn = document.createElement("a");
  editReviewBtn.href = `/review.html?restaurant_id=${self.restaurant.id}&id=${
    review.id
  }`;
  editReviewBtn.setAttribute("class", "button");
  editReviewBtn.innerHTML = "Edit Review";
  li.appendChild(editReviewBtn);

  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById("breadcrumb");
  const li = document.createElement("li");
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
  if (!url);
  url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return "";
  return decodeURIComponent(results[2].replace(/\+/g, " "));
};
