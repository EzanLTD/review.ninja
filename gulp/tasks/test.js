var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    karma = require('karma').server,
    config = require('../config').tests,
    runSequence = require('run-sequence');

// client-side tests
gulp.task('karma', function(done) {
  karma.start({
    configFile: config.karmaSrc,
    singleRun: true
  }, done)
});

// server-side tests
gulp.task('mocha', function() {
  return gulp.src(config.mochaSrc)
    .pipe(mocha({reporter: 'nyan'}));
})

gulp.task('test', function(callback) {
  runSequence('karma', 'mocha', callback);
});
