var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('./db');
var anitag = require('./anitag');
var linkfilter = require('./link');
var fs = Promise.promisifyAll(require('fs'));

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var redisClient = redis.createClient(6379, 'db.lizen.org');
Promise.longStackTraces();
var db = new DB(redisClient);
Promise.resolve(true)
    .then(function()
    {
        return db.Ready();
    })
    .then(function()
    {
        process.argv.splice(0, 2);
        return Promise.map(process.argv, function(l)
        {
            return Promise.props({deleted: db.DeleteLink(l), link: l});
        });
    })
    .then(function(res)
    {
        console.log("Deleted " + (new Date()).toString() + ":");
        var promises = [];
        res.forEach(function(r)
        {
            if (r.deleted)
            {
                promises.push(fs.appendFileAsync('badlinks.txt', r.link + "\n"));
                console.log(r.link);
            }
        });
        return Promise.all(promises);
    })
    .then(function()
    {
        console.log("Flushed to file");
        return Promise.resolve(true);
    })
    .then(function()
    {
        redisClient.end();
    })
    .catch(console.log);