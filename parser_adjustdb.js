var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('./db');
var anitag = require('./anitag');
var linkfilter = require('./link');

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

module.exports.MergeSimilarTags = function(redisClient)
{
    var db = new DB(redisClient);
    return db.Ready()
        .then(function()
        {
            return redisClient.smembersAsync('tags');
        })
        .then(function(tags)
        {
            var sets = anitag.GetEqualTags(tags);
            return Promise.map(sets, function(s)
            {
                var bestTag = anitag.GetBestTag(s);
                console.log("Merging tags " + s.join(", ") + " into " + bestTag);
                return db.MergeTags(bestTag, s);
                return Promise.resolve(true);
            });
        });
};

module.exports.DeleteBadLinks = function(redisClient)
{
    var count = 0;
    var db = new DB(redisClient);
    return db.Ready()
        .then(function()
        {
            return redisClient.smembersAsync('tag:[all]:links');
        }).then(function(links)
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
            return Promise.resolve(count);
        });
};
var redisClient = redis.createClient();
Promise.resolve(true)
    .then(function()
    {
        return module.exports.DeleteBadLinks(redisClient);
    })
    .then(function(c)
    {
        console.log("Deleted " + c + " urls");
    })
    .then(function()
    {
        return module.exports.MergeSimilarTags(redisClient);
    })
    .then(function()
    {
        redisClient.end();
    })
    .catch(console.log);