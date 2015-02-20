// modules
var express = require('express');

var router = express.Router();

router.all('/api/:obj/:fun', function(req, res) {
    res.set('Content-Type', 'application/json');
    api[req.params.obj][req.params.fun](req, function(err, obj) {
        if(err) {
            return res.status(err.code > 0 ? err.code : 500).send(JSON.stringify(err.text || err));
        }

        var ret = obj ? JSON.stringify(obj) : null;

        res.send(ret);
    });
});

module.exports = router;
