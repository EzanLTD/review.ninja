var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    scsslint = require('gulp-scss-lint'),
    config = require('../config').lint;

gulp.task('lint', ['eslint', 'scsslint']);

gulp.task('eslint', function() {
  gulp.src(['src/*.js', 'src/*/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
  });

gulp.task('scsslint', function() {
  gulp.src(config.scssSrc)
    .pipe(scsslint())
    .pipe(scsslint.failReporter())
});
