var http = require('http');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('./db');
var anitag = require('./anitag');
var linkfilter = require('./link');
var adjustdb = require('./parser_adjustdb.js');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var redisClient = redis.createClient(6379, 'db.lizen.org');
Promise.resolve(true)
    .then(function()
    {
        var db = new DB(redisClient);
        return db.Ready()
            .then(function()
            {
                return db.UpdateTags();
            })
    })
    /*
    .then(function()
    {
        return adjustdb.MergeSimilarTags(redisClient);
    })
     */
    .then(function()
    {
        redisClient.end();
    });