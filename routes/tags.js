var express = require('express');
var Promise = require('bluebird');
var redis = require('redis');
var router = express.Router();

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

router.all('/taglist/', function(req, res, next)
{
    var redisClient = redis.createClient();
    redisClient
        .smembersAsync('tags')
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
    var tag = req.params[0];
    var views = [];
    var page = 0;
    var links;
    if (req.query.hasOwnProperty('p'))
    {
        page = req.query.p;
    }
    redisClient
        .sortAsync('tag:[' + tag + ']:links', 'BY', 'link:[*]:meta->updated', 'LIMIT', (page * 30) + '', '30', 'DESC')
        .then(function(resp)
        {
            links = resp;
            var promises = [];
            for (var i in links)
            {
                promises.push(
                    (function(link)
                    {
                        return Promise.resolve(
                            redisClient.hgetallAsync('link:[' + links[i] + ']:meta')
                                .then(function(meta)
                                {
                                    meta['url'] = link;
                                    return meta;
                                }));
                    })(links[i]));
            }
            return Promise.all(promises);
        })
        .then(function(views)
        {
            redisClient.end();
            if (req.query.hasOwnProperty('jsonp') || req.query.hasOwnProperty('json'))
            {
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(req.query.jsonp + '(');
                }
                res.write(JSON.stringify(views));
                if (req.query.hasOwnProperty('jsonp'))
                {
                    res.write(');');
                }
                res.end();
            }
            else
            {
                res.render('list', {'views': views, 'res': res});
            }
        });

});

module.exports = router;
