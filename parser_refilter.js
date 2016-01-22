var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('./db');
var linkfilter = require('./linkfilter');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var PromiseRequest = Promise.method(
	function(options)
	{
		// Promisify http.request
		return new Promise(function(resolve, reject)
		{
			var request = http.request(options, function(response)
			{
				// Bundle the result
				var result = {
					'httpVersion': response.httpVersion,
					'statusCode': response.statusCode,
					'headers': response.headers,
					'body': '',
					'trailers': response.trailers
				};

				// Build the body
				response.on('data', function(chunk)
				{
					result.body += chunk;
				});
				response.on('end', function()
				{
					resolve(result);
				});
			});

			// Handle errors
			request.on('error', function(error)
			{
				reject(error);
			});

			request.end();
		});
	});

module.exports.DeleteBadLinks = function(redisClient)
{
	var count = 0;
	var db = new DB(redisClient);
	return new Promise(function(resolve, reject)
	{
		redisClient
			.smembersAsync('tag:[all]:links')
			.then(function(links)
			      {
				      var promises = [];
				      for (var i in links)
				      {
					      if (!linkfilter.IsLinkValid(links[i]))
					      {
						      count++;
						      promises.push(db.DeleteLink(links[i]));
					      }
				      }
				      return Promise.all(promises);
			      })
			.then(function()
			      {
				      resolve(count);
			      })
			.catch(function(err)
			       {
				       reject(err);
			       });
	});
};
var clnt = redis.createClient();
module.exports
      .DeleteBadLinks(clnt)
      .then(function(c)
            {
	            console.log("Deleted " + c + " urls");
	            clnt.end();
            })
      .catch(console.log);