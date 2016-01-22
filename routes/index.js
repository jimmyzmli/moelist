var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

router.use('/', function(req, res, next)
{
	if (req.url.slice(-1) === '/') {
		req.url = '/taglist/';
	}
	next();
});

module.exports = router;
