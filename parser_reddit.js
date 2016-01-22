var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var anitag = require('./anitag');
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

function FetchRedditLinks(subName, type)
{
	// Fetch links from reddit
	return new Promise(function(resolve, reject)
	{
		var results = [];
		return (function MakeRequest(after)
		{
			PromiseRequest({
				               host: 'www.reddit.com',
				               port: 80,
				               path: '/r/' + subName + '/' + type + '.json?t=day&show=all&limit=100' + (after === null ? '' : '&after=' + after),
				               method: 'GET'
			               })
				.then(function(resp)
				      {
					      if (resp['statusCode'] == 200)
					      {
						      var respObj = JSON.parse(resp['body']);
						      results = results.concat(respObj.data.children);
						      if (respObj.data.after !== null)
						      {
							      MakeRequest(respObj.data.after);
						      }
						      else
						      {
							      // Finished requests
							      resolve(results);
						      }
					      }
					      else
					      {
						      throw new Error('HTTP error status code ' + resp['statusCode']);
					      }
				      })
				.catch(function(error)
				       {
					       reject(error);
				       });
		})(null);
	});
}

module.exports.LoadRedditLinks = function(redis)
{
	return new Promise(function(resolve, reject)
	{
		FetchRedditLinks('awwnime', 'new')
			.then(function(results)
			      {
				      var promises = [];
				      // Clean up to standard format
				      for (var i in results)
				      {
					      var post = results[i].data;
					      if(linkfilter.IsLinkValid(post.url))
					      {
						      var tags = anitag.FindBracketTags(post.title);
						      promises.push(redis.saddAsync('tag:[all]:links', post.url));
						      promises.push(redis.hmsetAsync('link:[' + post.url + ']:meta', 'origin', '//reddit.com' + post.permalink, 'updated', parseInt(post.created)));
						      if (tags.length == 0)
						      {
							      tags.push('untagged');
						      }
						      promises.push(redis.saddAsync('link:[' + post.url + ']:tags', tags));
						      for (var k in tags)
						      {
							      promises.push(redis.saddAsync('tags', tags[k]));
							      promises.push(redis.saddAsync('tag:[' + tags[k] + ']:links', post.url));
						      }
					      }
				      }
				      return Promise.all(promises);
			      })
			.then(function()
			      {
				      redis.end();
				      resolve();
			      })
			.catch(function(err)
			       {
				       reject(err);
			       });
	});
};

module.exports.LoadRedditLinks(redis.createClient()).catch(console.log);
