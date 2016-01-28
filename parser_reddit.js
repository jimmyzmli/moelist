var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var anitag = require('./anitag');
var linkfilter = require('./linkfilter');
var DB = require('./db');

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

function FetchNewLinks(subName, type, timeFrame, before)
{
    return new Promise(function(resolve, reject)
    {
        var results = [];
        return (function MakeRequest(before)
        {
            PromiseRequest({
                host: 'www.reddit.com',
                port: 80,
                path: '/r/' + subName + '/' + type + '.json?t=' + timeFrame + '&show=all&limit=100' + (before == null ? '' : '&before=' + before),
                method: 'GET'
            })
                .then(function(resp)
                {
                    if (resp['statusCode'] == 200)
                    {
                        var respObj = JSON.parse(resp['body']);
                        results = results.concat(respObj.data.children);
                        if (respObj.data != null && respObj.data.children.length > 0)
                        {
                            MakeRequest(respObj.data.children[0].data.name);
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
        })(before);
    });
}

function FetchAllLinks(subName, type, timeFrame)
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
                path: '/r/' + subName + '/' + type + '.json?t=' + timeFrame + '&show=all&limit=100' + (after == null ? '' : '&after=' + after),
                method: 'GET'
            })
                .then(function(resp)
                {
                    if (resp['statusCode'] == 200)
                    {
                        var respObj = JSON.parse(resp['body']);
                        results = results.concat(respObj.data.children);
                        if (respObj.data != null && respObj.data.after != null)
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

module.exports.LoadRedditLinks = function(redisClient)
{
    return new Promise(function(resolve, reject)
    {
        var db = new DB(redisClient);
        redisClient.getAsync('parser:reddit_before_name')
            .then(function(before)
            {
                if (before == null)
                {
                    // How much history to fetch, hour, day, week, month, year, all (Please don't put all...)
                    return FetchAllLinks('awwnime', 'new', 'month')
                }
                else
                {
                    // How frequent does fetching happen?
                    return FetchNewLinks('awwnime', 'new', 'hour', before);
                }
            })
            .then(function(results)
            {
                // Update before name
                if (results.length > 0)
                {
                    return Promise.all([Promise.resolve(results), redisClient.setAsync('parser:reddit_before_name', results[0].data.name)]);
                }
                else
                {
                    return Promise.resolve([results]);
                }
            })
            .then(function(results)
            {
                results = results[0];
                console.log("Fetched " + results.length + " new posts");
                var promises = [];
                // Clean up to standard format
                for (var i in results)
                {
                    var post = results[i].data;
                    if (linkfilter.IsLinkValid(post.url))
                    {
                        promises.push(db.AddLink(post.url, anitag.FindBracketTags(post.title), '//reddit.com' + post.permalink, parseInt(post.created)));
                    }
                }
                return Promise.all(promises);
            })
            .then(function()
            {
                resolve();
            })
            .catch(function(err)
            {
                reject(err);
            });
    });
};
var redisClient = redis.createClient();
module.exports.LoadRedditLinks(redisClient).then(function()
{
    redisClient.end();
}).catch(console.log);
