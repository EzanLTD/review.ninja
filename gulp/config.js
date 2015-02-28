var path = require('path');
var src = './src';
var karmaPath = path.resolve('.');

module.exports = {
  lint: {
    jsSrc: [src + '/*.js', src + '/*/*.js'],
    scssSrc: [src + '/client/assets/styles/*.scss']
  },

  tests: {
    mochaSrc: src + '/tests/server/*/*.js',
    karmaSrc: karmaPath + '/' + 'src' + '/tests/karma.ninja.js'
  }
}
