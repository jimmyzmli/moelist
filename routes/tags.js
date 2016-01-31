var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('../db');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

router.all('/taglist/', function(req, res, next)
{
    var redisClient = redis.createClient();
    var db = new DB(redisClient);
    db.Ready()
        .then(function()
        {
            return redisClient.smembersAsync('tags');
        })
        .then(function(resp)
        {
            resp.sort();
            resp.unshift('all');
            redisClient.end();
            if (req.query.hasOwnProperty('jsonp') || req.query.hasOwnProperty('json'))
            {
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(req.query.jsonp + '(');
                }
                res.write(JSON.stringify(resp));
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(');');
                }
                res.end();
            }
            else
            {
                res.render('taglist', {'tags': resp, 'res': res});
            }
        });
});

router.all(/^\/tag\/([^\/]+)(?:$|\/.*$)/, function(req, res, next)
{
    var redisClient = redis.createClient();
    var db = new DB(redisClient);
    var tag = req.params[0];
    var page = 0;
    if (req.query.hasOwnProperty('p'))
    {
        page = req.query.p;
    }
    db.Ready()
        .then(function()
        {
            return db.GetLinks([tag], page * 30, 30);
        })
        .then(function(data)
        {
            redisClient.end();
            if (req.query.hasOwnProperty('jsonp') || req.query.hasOwnProperty('json'))
            {
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(req.query.jsonp + '(');
                }
                res.write(JSON.stringify(data));
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(');');
                }
                res.end();
            }
            else
            {
                res.render('list', {'views': data, 'res': res});
            }
        });

});

module.exports = router;
