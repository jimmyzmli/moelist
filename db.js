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
    var tagCombinedKey = 'mtag:[' + tags.join('+') + ']:links';
    var metaProps = ['src', 'origin', 'updated', '#'];
    var tagKeys = tags.map(function(t)
    {
        return 'tag:[' + t + ']:links';
    });
    return self.Ready()
        .then(function()
        {
            if (tags.length > 1)
            {
                return self.redisClient.sunionstoreAsync(tagCombinedKey, tagKeys);
            }
            else
            {
                tagCombinedKey = 'tag:[' + tags[0] + ']:links';
                return Promise.resolve(true);
            }
        })
        .then(function()
        {
            var getList = metaProps.map(function(p)
                {
                    if (p == '#')
                    {
                        return ['GET', p];
                    }
                    else
                    {
                        return ['GET', 'link:[*]:meta->' + p];
                    }
                })
                .reduce(function(p, c)
                {
                    return p.concat(c);
                });
            return self.redisClient.sortAsync([tagCombinedKey, 'BY', 'link:[*]:meta->updated', 'LIMIT', parseInt(pStart), parseInt(pLen), 'DESC'].concat(getList));
        })
        .then(function(res)
        {
            // Rename some keys
            var nameMap = {'#': 'url'};
            res = res.reduce(function(p, c, i)
            {
                var r;
                var k = metaProps[i % metaProps.length];
                if (i % metaProps.length == 0)
                {
                    r = {};
                    p.push(r);
                }
                else
                {
                    r = p[p.length - 1];
                }
                if (nameMap.hasOwnProperty(k))
                {
                    k = nameMap[k];
                }
                r[k] = c;
                return p;
            }, []);
            return Promise.resolve(res);
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
