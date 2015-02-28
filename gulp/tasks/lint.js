var gulp = require('gulp'),
    eslint = require('gulp-eslint'),
    scsslint = require('gulp-scss-lint'),
    config = require('../config').lint,
    runSequence = require('run-sequence');

// eslint task for js files
gulp.task('eslint', function() {
  gulp.src(['src/*.js', 'src/*/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
  });

// scss lint task
gulp.task('scsslint', function() {
  gulp.src(config.scssSrc)
    .pipe(scsslint())
    .pipe(scsslint.failReporter())
});

gulp.task('lint', function(callback) {
  runSequence('eslint', 'scsslint', callback);
});
