// modules
var express = require('express');
var socket = require('../services/socket.js');

var router = express.Router();

router.all('/github/webhook/:id', function(req, res) {
    var event = req.headers['x-github-event'];
    try {
        if(!webhooks[event]) {
            return res.status(400).send('Unsupported event');
        }
        webhooks[event](req, res);
    } catch(err) {
        res.status(500).send('Internal server error');
    }

    try {
        socket.emit(event, req.args);
    } catch(err) {}
});

module.exports = router;
