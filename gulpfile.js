const gulp = require('gulp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const del = require('del')
const errorHandler = (err) => {
    console.log(`Oh 💩! ${err.message}`);
};

const paths = {
    styles: {
        src: './css/**/*.scss',
        dest: './build/css'
    },
    scripts: {
        src: ['./js/main.js', './js/restaurant_info.js', './js/dbhelper.js', './js/**/*.js'],
        dest: './build/js'
    },
    html: {
        src: ['./index.html', './restaurant.html'],
        dest: './build'
    },
    imgs: {
        src: './img/**/*.jpg',
        dest: './build/img'
    },
    serviceWorker: {
        src: './sw.js',
        dest: './build'
    }
}

/**
 * Clear the build directory to ensure that no extra files are left there.
 */
gulp.task('clean', () => {
    return del(['./build/**/*', '!./data/**/*'])
        .then((paths) => {
            console.log(`🔫 Deleted files and folders:\n${paths.join('\n')}`);
        })
});

/**
 * Styles instructions for production
 */
gulp.task('styles', () => {
    console.log('🏗️ Building styles;');

    return gulp.src(paths.styles.src)
        .pipe(sass().on('error', error => errorHandler(error)))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }).on('error', error => errorHandler(error)))
        .pipe(concat('styles.css').on('error', error => errorHandler(error)))
        // .pipe(gzip().on('error', error => errorHandler(error)))
        .pipe(gulp.dest(paths.styles.dest).on('error', error => errorHandler(error)));
});

/**
 * Prepare the javascript files for production
 */
gulp.task('scripts', () => {
    console.log('🏗️ Building scripts;');
    // 1. Get a glob of the files.
    return gulp.src(paths.scripts.src)
        // 2. Babel them to vanilla js.
        .pipe(babel({
            compact: true,
            presets: ['env']
        }).on('error', error => errorHandler(error)))
        // 3. done.
        .pipe(gulp.dest(paths.scripts.dest).on('error', error => errorHandler(error)))
});

/**
 * Copy over the service worker.
 */
gulp.task('serviceWorker', () => (
    gulp.src(paths.serviceWorker.src)
        .pipe(gulp.dest(paths.serviceWorker.dest))
));

/**
 * Build the html files for production
 */
gulp.task('htmls', () => {
    console.log('🏗️ Building html;');
    // Move the html files to the build directory
    return gulp.src(paths.html.src)
        .pipe(gulp.dest(paths.html.dest))
});

/**
 * Build the images for production
 */
gulp.task('images', () => {
    console.log('🏗️ Building images;');
    // No node image compressors looked decent so just copy the files.
    return gulp.src(paths.imgs.src)
        .pipe(gulp.dest(paths.imgs.dest));
});

/**
 * Task to start watching all the files for hot reloading
 */
gulp.task('watch', (done) => {
    // Javascript
    gulp.watch(paths.scripts.src, gulp.series('scripts'));
    // CSS
    gulp.watch(paths.styles.src, gulp.series('styles'));
    // html
    gulp.watch(paths.html.src, gulp.series('htmls'));
    done();
});

/**
 * Server for the files.
 */
gulp.task('server', (done) => {
    const port = 8000
    console.log(`🖥️ Starting server on port ${port}. http://localhost:${port}`);

    connect.server({
        // Server configuration
        root: './build',
        livereload: true,
        port: port
    });
    done();
});

/**
 * Run it all!
 */
gulp.task('default', gulp.series('clean', 'styles', 'scripts', 'serviceWorker', 'htmls', 'images', 'watch', 'server'));
