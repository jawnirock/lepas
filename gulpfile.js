const gulp = require('gulp');
const plumber = require('gulp-plumber');
const rename = require('gulp-rename');
const sass = require('gulp-sass')(require('sass'));
const es6Promise = require('es6-promise').polyfill;

// If node version is lower than v.0.1.2
es6Promise();

gulp.task('styles', async function () {
  const autoprefixer = await import('gulp-autoprefixer').then((module) => module.default);

  return gulp.src(['scss/**/*.scss'])
    .pipe(plumber({
      errorHandler: function (error) {
        console.log(error.message);
        this.emit('end');
      }
    }))
    .pipe(sass())
    .pipe(autoprefixer('last 2 versions'))
    .pipe(rename('style.css.liquid'))
    .pipe(gulp.dest('./assets'));
});

gulp.task('default', function () {
  gulp.watch("scss/**/*.scss").on('change', gulp.series('styles'));
});
