// modules
var express = require('express');

var router = express.Router();

// custom middleware
router.use('/api', require('./middleware/param'));
router.use('/api', require('./middleware/authenticated'));
router.use('/github/webhook', require('./middleware/param'));

// papertrail middleware
router.use('/api', require('./middleware/papertrail'));
router.use('/github/webhook', require('./middleware/papertrail'));

// keen middleware
router.use('/api/github', require('./middleware/keen'));

module.exports = router;
