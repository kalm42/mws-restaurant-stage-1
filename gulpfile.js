const gulp = require("gulp");
const sass = require("gulp-sass");
const autoprefixer = require("gulp-autoprefixer");
const babel = require("gulp-babel");
const concat = require("gulp-concat");
const del = require("del");
const browserify = require("browserify");
const babelify = require("babelify");
const source = require("vinyl-source-stream");
const glob = require("glob");
const es = require("event-stream");
const imagemin = require("gulp-imagemin");
const htmlmin = require("gulp-htmlmin");
const minify = require("gulp-minify");
const uglify = require("gulp-uglify");
const streamify = require("gulp-streamify");

const errorHandler = err => {
  console.log(`Oh 💩 ! ${err.message}`);
};

const paths = {
  styles: {
    src: "./css/**/*.scss",
    dest: "./build/css"
  },
  scripts: {
    src: [
      "./js/main.js",
      "./js/restaurant_info.js",
      "./js/swregistrar.js",
      "./js/**/*.js"
    ],
    dest: "./build/js"
  },
  html: {
    src: ["./*.html"],
    dest: "./build"
  },
  imgs: {
    src: ["./img/**/*.jpg", "./img/**/*.png"],
    dest: "./build/img"
  },
  serviceWorker: {
    src: "./sw.js",
    dest: "./build"
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
  return gulp
    .src(paths.styles.src)
    .pipe(sass().on("error", error => errorHandler(error)))
    .pipe(
      autoprefixer({
        browsers: ["last 2 versions"]
      }).on("error", error => errorHandler(error))
    )
    .pipe(minify())
    .pipe(
      gulp.dest(paths.styles.dest).on("error", error => errorHandler(error))
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
        .pipe(streamify(uglify()))
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
  return browserify({ entries: [paths.serviceWorker.src] })
    .transform("babelify", { presets: ["@babel/preset-env"] })
    .require(paths.serviceWorker.src)
    .bundle()
    .pipe(source(paths.serviceWorker.src))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest("./build"));
});

/**
 * Build the html files for production
 */
gulp.task("htmls", () => {
  // Move the html files to the build directory
  return gulp
    .src(paths.html.src)
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(minify())
    .pipe(gulp.dest(paths.html.dest));
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
  return gulp
    .src(paths.imgs.src)
    .pipe(imagemin())
    .pipe(gulp.dest(paths.imgs.dest));
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
    "watch"
  )
);
