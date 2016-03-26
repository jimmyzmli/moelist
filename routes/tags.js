var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var DB = require('../db');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

router.all('/taglist/', function(req, res, next)
{
    var redisClient = redis.createClient(6379, 'db.lizen.org');
    var db = new DB(redisClient);
    db.Ready()
        .then(function()
        {
            return db.GetTags();
        })
        .then(function(tags)
        {
            tags = tags.filter(function(t)
            {
                return t.name != 'untagged' && t.count >= 1;
            });
            var resp = tags.map(function(t)
            {
                return t.name;
            });
            resp.sort();
            resp.unshift('untagged');
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
                res.render('taglist', {'page': 'taglist', 'cookies': req.cookies, 'tags': resp, 'res': res});
            }
        });
});

router.all(/^\/tag\/([^\/]+)(?:$|\/.*$)/, function(req, res, next)
{
    var redisClient = redis.createClient(6379, 'db.lizen.org');
    var db = new DB(redisClient);
    var tags = req.params[0].split('+');
    var page = 0;
    if (req.query.hasOwnProperty('p'))
    {
        page = req.query.p;
    }
    db.Ready()
        .then(function()
        {
            var flags = ['-18+', '-porn'];
            if (req.cookies.isAdult == "true")
            {
                flags = ['-porn'];
            }
            if (req.cookies.iWantPorn == "true")
            {
                flags = [];
            }
            return db.GetLinks(tags, flags, page * 30, 30);
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
                res.render('list', {
                    'page': 'list',
                    'cookies': req.cookies,
                    'tagName': req.params[0],
                    'views': data,
                    'res': res
                });
            }
        });

});

module.exports = router;
