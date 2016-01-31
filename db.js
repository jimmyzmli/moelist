var http = require('http');
var Promise = require('bluebird');
var anitag = require('./anitag');

var PROPS_TAG = ['links'];
var PROPS_LINK = ['meta', 'tags', 'tagmeta'];
var DB_NUM = 3;

var DB = function(redis)
{
    var self = this;
    self.redisClient = redis;
    var readyPromise = self.redisClient.selectAsync(parseInt(DB_NUM));

    self.Ready = function()
    {
        return readyPromise;
    };
};

DB.prototype.DeleteLink = function(link)
{
    var self = this;
    // Remove link from tags
    return self.Ready()
        .then(function()
        {
            return self.redisClient.smembersAsync('link:[' + link + ']:tags');
        })
        .then(function(tags)
        {
            var promises = [];
            tags.forEach(function(tag)
            {
                promises.push(self.redisClient.sremAsync('tag:[' + tag + ']:links', link));
            });
            return Promise.all(promises);
        })
        .then(function()
        {
            var promises = [];
            PROPS_LINK.forEach(function(p)
            {
                promises.push(self.redisClient.delAsync('link:[' + link + ']:' + p));
            });
            promises.push(self.redisClient.sremAsync('tag:[all]:links', link));
            return Promise.all(promises);
        });
};

DB.prototype.AddLink = function(url, tagBlob, tagAlg, src, srcLink, updated)
{
    var self = this;
    return self.Ready()
        .then(function()
        {
            var promises = [];
            var tags = anitag.TagScan(tagAlg, tagBlob);
            promises.push(self.redisClient.saddAsync('tag:[all]:links', url));
            promises.push(self.redisClient.hmsetAsync('link:[' + url + ']:meta', 'src', src, 'origin', srcLink, 'updated', updated));
            promises.push(self.redisClient.hmsetAsync('link:[' + url + ']:tagmeta', 'blob', tagBlob, 'alg', tagAlg));
            if (tags.length == 0)
            {
                tags.push('untagged');
            }
            promises.push(self.redisClient.saddAsync('link:[' + url + ']:tags', tags));
            for (var k in tags)
            {
                promises.push(self.redisClient.saddAsync('tags', tags[k]));
                promises.push(self.redisClient.saddAsync('tag:[' + tags[k] + ']:links', url));
            }
            return Promise.all(promises).catch(console.log);
        });
};

DB.prototype.GetLinks = function(tags, pStart, pLen)
{
    var self = this;
    return self.Ready()
        .then(function()
        {
            var promises = Promise.map(tags, function(tag)
            {
                return self.redisClient
                    .sortAsync('tag:[' + tag + ']:links', 'BY', 'link:[*]:meta->updated', 'LIMIT', parseInt(pStart), parseInt(pLen), 'DESC');
            });
            return Promise.reduce(promises, function(p, c)
            {
                return p.concat(c);
            }, []);
        })
        .then(function(links)
        {
            return Promise.map(links, function(l)
            {
                return Promise.join(
                    self.redisClient.smembersAsync('link:[' + l + ']:tags'),
                    self.redisClient.hgetallAsync('link:[' + l + ']:meta'),
                    function(tags, meta)
                    {
                        meta['tags'] = tags;
                        meta['url'] = l;
                        return meta;
                    });
            });
        });
};

DB.prototype.GetTags = function()
{

};

DB.prototype.MergeTags = function(tag, taglist)
{
    var self = this;
    return self.Ready()
        .then(function()
        {
            return self.redisClient.sremAsync('tags', taglist);
        })
        .then(function()
        {
            return Promise.all(PROPS_TAG.map(function(p)
            {
                var taglistKeys = [tag].concat(taglist).map(function(t)
                {
                    return 'tag:[' + t + ']:' + p;
                });
                return self.redisClient.sunionstoreAsync(taglistKeys[0], taglistKeys);
            }));
        })
        .then(function()
        {
            return Promise.resolve(true);
        });
};

module.exports = DB;