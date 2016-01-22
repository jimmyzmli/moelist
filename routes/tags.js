var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

router.all('/taglist/', function(req, res, next)
{
	var redisClient = redis.createClient();
	redisClient
		.smembersAsync('tags')
		.then(function(resp)
		      {
			      resp.sort();
			      resp.unshift('all');
			      redisClient.end();
			      res.render('taglist', {'tags': resp});
			      next();
		      });
});

router.all(/^\/tag\/([^\/]+)(?:$|\/.*$)/, function(req, res, next)
{
	var redisClient = redis.createClient();
	var tag = req.params[0];
	var views = [];
	var links;
	redisClient
		.sortAsync('tag:[' + tag + ']:links', 'BY', 'link:[*]:meta->updated', 'LIMIT', '0', '30')
		.then(function(resp)
		      {
			      links = resp;
			      var promises = [];
			      for (var i in links)
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
			      res.render('list', {'views': views});
			      next();
		      });

});

module.exports = router;
