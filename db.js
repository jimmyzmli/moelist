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

module.exports = DB;