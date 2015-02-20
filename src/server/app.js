var async = require('async');
var colors = require('colors');
var express = require('express');
var glob = require('glob');
var merge = require('merge');
var passport = require('passport');
var path = require('path');
var sass = require('node-sass');
var socket = require('./services/socket.js');

//////////////////////////////////////////////////////////////////////////////////////////////////
// Load configuration
//////////////////////////////////////////////////////////////////////////////////////////////////

global.config = require('./../config');

//////////////////////////////////////////////////////////////////////////////////////////////////
// Express application
//////////////////////////////////////////////////////////////////////////////////////////////////

var app = express();
var api = {};
var webhooks = {};

app.use(require('x-frame-options')());
app.use(require('body-parser').json());
app.use(require('cookie-parser')());
app.use(require('cookie-session')({
    secret: config.server.security.sessionSecret,
    cookie: {
        maxAge: config.server.security.cookieMaxAge
    }
}));
app.use(passport.initialize());
app.use(passport.session());

async.series([

    function(callback) {
        console.log('checking configs'.bold);

        if(config.server.http.protocol !== 'http' && config.server.http.protocol !== 'https') {
            throw new Error('PROTOCOL must be "http" or "https"');
        }

        if(config.server.github.protocol !== 'http' && config.server.github.protocol !== 'https') {
            throw new Error('GITHUB_PROTOCOL must be "http" or "https"');
        }

        console.log('✓ '.bold.green + 'configs seem ok');

        var url = require('./services/url');

        console.log('Host:        ' + url.baseUrl);
        console.log('GitHub:      ' + url.githubBase);
        console.log('GitHub-Api:  ' + url.githubApiBase);
        callback();
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap certificates
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap certificates'.bold);

        var https = require('https'),
            fs = require('fs');

        if(config.server.https.certs) {
            glob(config.server.https.certs, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        try {
                            https.globalAgent.options.ca = https.globalAgent.options.ca || [];
                            https.globalAgent.options.ca.push(fs.readFileSync(path.relative(process.cwd(), f)));
                            console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        } catch (ex) {
                            console.log('✖ '.bold.red + path.relative(process.cwd(), f));
                            console.log(ex.stack);
                        }
                    });
                }
                callback();
            });
        } else {
            callback();
        }

    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap static
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap static files'.bold);

        var publish = function(p, path) {
            app.use(sass.middleware({
                src: p,
                dest: p,
                outputStyle: 'compressed',
                force: config.server.always_recompile_sass
            }));
            app.use(path, express.static(p));
        };

        config.server.static.app.forEach(function(p) {
            publish(p, '/');
        });
        config.server.static.lib.forEach(function(p) {
            publish(p, '/lib');
        });
        callback();
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap mongoose
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap mongoose'.bold);

        var mongoose = require('mongoose');

        mongoose.connect(config.server.mongodb.uri, {
            server: {
                socketOptions: {
                    keepAlive: 1
                }
            }
        });

        global.models = {};

        async.eachSeries(config.server.documents, function(p, callback) {
            glob(p, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        try {
                            global.models = merge(global.models, require(f));
                            console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        } catch (ex) {
                            console.log('✖ '.bold.red + path.relative(process.cwd(), f));
                            console.log(ex.stack);
                        }
                    });
                    callback();
                }
            });
        }, callback);
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap passport
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap passport'.bold);

        async.eachSeries(config.server.passport, function(p, callback) {
            glob(p, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        require(f);
                    });
                }
                callback();
            });
        }, callback);
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap controller
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap controller'.bold);

        async.eachSeries(config.server.controller, function(p, callback) {
            glob(p, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        try {
                            app.use('/', require(f));
                            console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        } catch (ex) {
                            console.log('✖ '.bold.red + path.relative(process.cwd(), f));
                            console.log(ex.stack);
                        }
                    });
                }
                callback();
            });
        }, callback);
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap api
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap api'.bold);

        async.eachSeries(config.server.api, function(p, callback) {
            glob(p, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        api[path.basename(f, '.js')] = require(f);
                    });
                }
                callback();
            });
        }, callback);
    },

    //////////////////////////////////////////////////////////////////////////////////////////////
    // Bootstrap webhooks
    //////////////////////////////////////////////////////////////////////////////////////////////

    function(callback) {

        console.log('bootstrap webhooks'.bold);

        async.eachSeries(config.server.webhooks, function(p, callback) {
            glob(p, function(err, file) {
                if (file && file.length) {
                    file.forEach(function(f) {
                        console.log('✓ '.bold.green + path.relative(process.cwd(), f));
                        webhooks[path.basename(f, '.js')] = require(f);
                    });
                }
                callback();
            });
        }, callback);
    }

], function(err, res) {
    console.log('\n✓ '.bold.green + 'bootstrapped, '.bold + 'app listening on localhost:' + config.server.localport);
});

module.exports = app;
