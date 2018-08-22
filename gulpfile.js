const gulp = require("gulp");
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const connect = require("gulp-connect");
const del = require("del");
const browserify = require("browserify");
const babelify = require("babelify");
const source = require("vinyl-source-stream");
const glob = require("glob");
const es = require("event-stream");

const errorHandler = err => {
  console.log(`Oh 💩 ! ${err.message}`);
};

const paths = {
  styles: {
    src: "./css/**/*.scss",
    dest: "./build/css"
  },
  scripts: {
    src: ["./js/main.js", "./js/restaurant_info.js", "./js/swregistrar.js"],
    dest: "./build/js"
  },
  html: {
    src: ["./index.html", "./restaurant.html"],
    dest: "./build"
  },
  imgs: {
    src: ["./img/**/*.jpg", "./img/**/*.png"],
    dest: "./build/img"
  },
  serviceWorker: {
    src: ["./sw.js"],
    dest: "./build"
  },
  dbhelper: {
    src: ["./js/dbhelper.js"],
    dest: "./build/js"
  },
  manifest: {
    src: ["./manifest.json"],
    dest: "./build"
  }
};

/**
 * Clear the build directory to ensure that no extra files are left there.
 */
gulp.task("clean", () => {
  return del(["./build/**/*", "!./data/**/*"]).then(paths => {
    console.log(`🔫 Deleted files and folders:\n${paths.join("\n")}`);
  });
});

/**
 * Styles instructions for production
 */
gulp.task("styles", () => {
  console.log("🏗️ Building styles;");

  return (
    gulp
      .src(paths.styles.src)
      .pipe(sass().on("error", error => errorHandler(error)))
      .pipe(
        autoprefixer({
          browsers: ["last 2 versions"]
        }).on("error", error => errorHandler(error))
      )
      .pipe(concat("styles.css").on("error", error => errorHandler(error)))
      // .pipe(gzip().on('error', error => errorHandler(error)))
      .pipe(
        gulp.dest(paths.styles.dest).on("error", error => errorHandler(error))
      )
  );
});

/**
 * Prepare the javascript files for production
 * Inspired, heavily, from https://fettblog.eu/gulp-browserify-multiple-bundles/
 */
gulp.task("scripts", done => {
  glob("./js/*.js", (err, files) => {
    if (err) {
      done(err);
    }

    const tasks = files.map(file => {
      return browserify({ entries: [file] })
        .transform("babelify", { presets: ["@babel/preset-env"] })
        .require(file)
        .bundle()
        .pipe(source(file))
        .pipe(gulp.dest("./build"));
    });
    es.merge(tasks).on("end", done);
  });
});

/**
 * Process the service worker.
 */
gulp.task("serviceWorker", () => {
  // Bundle required files for browser rendering.
  const b = browserify();

  return (
    b
      // Run the service worker js through babel
      .transform("babelify", { presets: ["@babel/preset-env"] })
      // Pull in the service worker file
      .require(paths.serviceWorker.src)
      // bundle the require'd files.
      .bundle()
      // make everything a stream again for gulp.
      .pipe(source("sw.js"))
      // spit out the file
      .pipe(gulp.dest(paths.serviceWorker.dest))
  );
});

/**
 * Build the html files for production
 */
gulp.task("htmls", () => {
  // Move the html files to the build directory
  return gulp.src(paths.html.src).pipe(gulp.dest(paths.html.dest));
});

/**
 * Build the manifest file for production
 */
gulp.task("manifest", () => {
  // Move the manifest file into production.
  return gulp.src(paths.manifest.src).pipe(gulp.dest(paths.manifest.dest));
});

/**
 * Build the images for production
 */
gulp.task("images", () => {
  // No node image compressors looked decent so just copy the files.
  return gulp.src(paths.imgs.src).pipe(gulp.dest(paths.imgs.dest));
});

/**
 * Task to start watching all the files for hot reloading
 */
gulp.task("watch", done => {
  // Javascript
  gulp.watch(paths.scripts.src, gulp.series("scripts"));
  gulp.watch(paths.serviceWorker.src, gulp.series("serviceWorker"));
  // CSS
  gulp.watch(paths.styles.src, gulp.series("styles"));
  // html
  gulp.watch(paths.html.src, gulp.series("htmls"));
  done();
});

/**
 * Server for the files.
 */
gulp.task("server", done => {
  const port = 8000;
  console.log(`🖥️ Starting server on port ${port}. http://localhost:${port}`);

  connect.server({
    // Server configuration
    root: "./build",
    livereload: true,
    port: port
  });
  done();
});

/**
 * Run it all!
 */
gulp.task(
  "default",
  gulp.series(
    "clean",
    "styles",
    "scripts",
    "serviceWorker",
    "htmls",
    "manifest",
    "images",
    "watch",
    "server"
  )
);
