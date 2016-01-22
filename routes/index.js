var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

/* GET home page. */
router.get('/', function(req, res, next)
{
	var redisClient = redis.createClient();
	var tag = "all";
	var views = [];
	var links;
	redisClient
		.sortAsync('tag:[' + tag + ']:links', 'BY', 'link:[*]:meta->updated', 'LIMIT', '0', '30')
		.then(function(resp)
		      {
			      resp = resp.splice(0, 30);
			      links = resp;
			      var promises = [];
			      for (i in links)
			      {
				      promises.push(
					      (function(link)
					      {
						      return Promise.resolve(
							      redisClient.hgetallAsync('link:[' + links[i] + ']:meta')
							           .then(function(meta)
							                 {
								                 meta['url'] = link;
								                 return meta;
							                 }));
					      })(links[i]));
			      }
			      return Promise.all(promises);
		      })
		.then(function(views)
		      {
			      redisClient.end();
			      res.render('index', {'views': views});
		      });

});

module.exports = router;
