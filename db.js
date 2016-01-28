var http = require('http');
var Promise = require('bluebird');
var linkfilter = require('./linkfilter');

var DB = function(redis)
{
    this.redisClient = redis;
};

DB.prototype.DeleteLink = function(link)
{
    var redisClient = this.redisClient;
    // Remove link from tags
    return redisClient
        .smembersAsync('link:[' + link + ']:tags')
        .then(function(tags)
        {
            var promises = [];
            for (var i in tags)
            {
                promises.push(redisClient.sremAsync('tag:[' + tags[i] + ']:links', link));
            }
            return Promise.all(promises);
        })
        .then(function()
        {
            var promises = [];
            promises.push(redisClient.delAsync('link:[' + link + ']:tags'));
            promises.push(redisClient.delAsync('link:[' + link + ']:meta'));
            promises.push(redisClient.delAsync('link:[' + link + ']:t'));
            promises.push(redisClient.sremAsync('tag:[all]:links', link));
            return Promise.all(promises);
        });
};

DB.prototype.AddLink = function(url, tags, src, updated)
{
    var promises = [];
    var redisClient = this.redisClient;
    promises.push(redisClient.saddAsync('tag:[all]:links', url));
    promises.push(redisClient.hmsetAsync('link:[' + url + ']:meta', 'origin', src, 'updated', updated));
    if (tags.length == 0)
    {
        tags.push('untagged');
    }
    promises.push(redisClient.saddAsync('link:[' + url + ']:tags', tags));
    for (var k in tags)
    {
        promises.push(redisClient.saddAsync('tags', tags[k]));
        promises.push(redisClient.saddAsync('tag:[' + tags[k] + ']:links', url));
    }
    return Promise.all(promises).catch(console.log);
}

module.exports = DB;