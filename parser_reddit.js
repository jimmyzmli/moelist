var Promise = require('bluebird');
var linkfilter = require('./link');
var DB = require('./db');
var Entities = require('html-entities').XmlEntities;

var entities = new Entities();

const getContent = function(url)
{
    // return new pending promise
    return new Promise(function(resolve, reject)
    {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, function(response)
        {
            // follow redirect
            if (response.statusCode == 301)
            {
                resolve(getContent(response.headers['location']));
            }

            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299)
            {
                reject(new Error('Failed to load page, status code: ' + response.statusCode + ' [' + url + ']'));
            }
            // temporary data holder
            const body = [];
            // on every content chunk, push it to the data array
            response.on('data', function(chunk)
                {
                    body.push(chunk)
                }
            );
            // we are done, resolve promise with those joined chunks
            response.on('end', function()
                {
                    var result = {
                        'httpVersion': response.httpVersion,
                        'statusCode': response.statusCode,
                        'headers': response.headers,
                        'body': body.join(''),
                        'trailers': response.trailers
                    };
                    resolve(result);
                }
            );
        });
        // handle connection errors of the request
        request.on('error', function(err)
        {
            reject(err)
        });
    });
};

function FetchLinks(subName, type, timeFrame, getNextLinkCb)
{
    // Fetch links from reddit
    return new Promise(function(resolve, reject)
    {
        var results = [];
        return (function MakeRequest(nextLink)
        {
            getContent('https://www.reddit.com' + '/r/' + subName + '/' + type + '.json?t=' + timeFrame + '&show=all&limit=100&' + (nextLink == null ? '' : nextLink))
                .then(function(resp)
                {
                    var respObj = JSON.parse(resp['body']);
                    results = results.concat(respObj.data.children);
                    if (respObj.data != null && respObj.data.after != null)
                    {
                        MakeRequest(getNextLinkCb(respObj));
                    }
                    else
                    {
                        // Finished requests
                        resolve(results);
                    }
                })
                .catch(function(error)
                {
                    reject(error);
                });
        })(getNextLinkCb(null));
    });
}

function FetchNewLinks(subName, type, timeFrame, before)
{
    return FetchLinks(subName, type, timeFrame, function(data)
    {
        if (data == null)
        {
            return 'before=' + before;
        }
        else
        {
            return 'before=' + data.data.children[0].data.name;
        }
    });
}

function FetchAllLinks(subName, type, timeFrame)
{
    return FetchLinks(subName, type, timeFrame, function(data)
    {
        if (data != null)
        {
            return 'after=' + data.data.after;
        }
    });
}

function IsPostAlive(subName, postId)
{
    return new Promise(function(resolve, reject)
    {
        return getContent('https://www.reddit.com' + '/r/' + subName + '/new.json?t=all&show=all&limit=1&' + 'before=' + postId)
            .then(function(resp)
            {
                var respObj = JSON.parse(resp['body']);
                if (respObj.data.children.length == 0)
                {
                    return getContent('https://www.reddit.com' + '/r/' + subName + '/new.json?t=all&show=all&limit=1&' + 'after=' + postId);
                }
                else
                {
                    resolve(true);
                }
            })
            .then(function(resp)
            {
                var respObj = JSON.parse(resp['body']);
                resolve(respObj.data.children.length != 0);
            })
            .catch(function(err)
            {
                reject(err);
            });
    });
}

module.exports.LoadRedditLinks = function(redisClient, subreddit, flags)
{
    var beforeKey = 'parser:subreddit[' + subreddit + ']:before_name';
    return new Promise(function(resolve, reject)
    {
        var db = new DB(redisClient);
        db.Ready()
            .then(function()
            {
                return redisClient.lrangeAsync(beforeKey, 0, 0);
            })
            .then(function(before)
            {
                if (before.length == 0 || before[0] == null)
                {
                    // How much history to fetch, hour, day, week, month, year, all (Please don't put all...)
                    return FetchAllLinks(subreddit, 'new', 'month')
                }
                else
                {
                    return IsPostAlive(subreddit, before[0])
                        .then(function(isAlive)
                        {
                            if (isAlive)
                            {
                                // How frequent does fetching happen?
                                return FetchNewLinks(subreddit, 'new', 'hour', before);
                            }
                            else
                            {
                                return redisClient.lpopAsync(beforeKey)
                                    .then(function()
                                    {
                                        return module.exports.LoadRedditLinks(redisClient, subreddit, flags);
                                    })
                                    .then(function()
                                    {
                                        resolve();
                                    });
                            }
                        });
                }
            })
            .then(function(results)
            {
                // Update before name
                if (results.length > 0)
                {
                    var redisUpdate = redisClient
                        .lpushAsync(beforeKey, results[0].data.name)
                        .then(function()
                        {
                            return redisClient.ltrim(beforeKey, 0, 5);
                        });
                    return Promise.all([Promise.resolve(results), redisUpdate]);
                }
                else
                {
                    return Promise.resolve([results]);
                }
            })
            .then(function(results)
            {
                results = results[0];
                console.log("Fetched " + results.length + " new posts for " + subreddit);
                var promises = [];
                // Clean up to standard format
                for (var i in results)
                {
                    var post = results[i].data;
                    if (linkfilter.IsLinkValid(post.url))
                    {
                        promises.push(db.AddLink(post.url, entities.decode(post.title), 'bracket', flags, 'Reddit:' + subreddit, '//reddit.com' + post.permalink, parseInt(post.created)));
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

module.exports.Run = function(redisClient)
{
    var subReddits = {
        'awwnime': [],
        'headpats': [],
        'imouto': [],
        'ZettaiRyouiki': [],
        'k_on': [],
        'animelegs': ['18+'],
        'pantsu': ['18+'],
        'ecchi': ['18+', 'porn'],
        'sukebei': ['18+', 'porn']
    };
    return Promise.map(Object.keys(subReddits), function(sub)
    {
        return module.exports.LoadRedditLinks(redisClient, sub, subReddits[sub]);
    })
};