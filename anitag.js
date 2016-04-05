var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"));

var FuzzySet = require('fuzzyset.js');
var levenshtein = require('fast-levenshtein');

var common = ['iDOLMSTER', 'iDOLMASTER', 'Original', 'Fire Emblem', 'Fate', 'Yu-Gi-Oh!', 'Utawareru Mono', 'Monogatari', 'Love Live!', 'K-ON'];
var rejectMap = {'gate': ['fate'], 'lol': ['k-on', 'k-on!', 'k-on!!']};

var namePairs;
var nameSet;

function LoadLists()
{
    if (namePairs == null)
    {
        return Promise.all([
            fs.readFileAsync(__dirname + "/data/anime_names.json")
                .then(function(data)
                {
                    namePairs = JSON.parse(data);
                }),
            fs.readFileAsync(__dirname + "/data/anime_namesflat.json")
                .then(function(data)
                {
                    nameSet = FuzzySet(JSON.parse(data));
                })]);
    }
    else
    {
        return Promise.resolve();
    }
}


module.exports.GetStdTag = function(tag)
{
    for (i in namePairs)
    {
        var p = namePairs[i];
        if (p.indexOf(tag) != -1)
        {
            return p[p.length - 2];
        }
    }
    return null;
};

module.exports.GetBestTag = function(tags)
{
    var lowestSum;
    var lowestTag;
    tags.forEach(function(t)
    {
        var sd = tags.reduce(function(p, c)
        {
            return c == t ? 0 : p + levenshtein.get(t, c);
        }, 0);
        if (lowestSum == null || lowestSum > sd)
        {
            lowestSum = sd;
            lowestTag = t;
        }
    });
    return lowestTag;
};

module.exports.GetEqualTags = function(tags)
{
    var result = [];
    var p = {};
    tags.forEach(function(ct)
    {
        p[ct] = [];
        tags.forEach(function(t)
        {
            if (t != ct)
            {
                var d = levenshtein.get(ct, t);
                if (d <= 2)
                {
                    p[ct].push(t);
                }
            }
        });
    });
    tags.forEach(function(ct)
    {
        var r = {};
        (function WalkTags(t)
        {
            if (t == null)
            {
                return;
            }
            r[t] = 1;
            p[t].forEach(function(k, i)
            {
                p[t][i] = null;
                WalkTags(k);
            });
        })(ct);
        r = Object.keys(r);
        if (r.length > 1)
        {
            var reject = false;
            var rl = r.map(function(t)
            {
                return t.toLowerCase().trim();
            });
            Object.keys(rejectMap).forEach(function(p)
            {
                var conj = rl.filter(function(n)
                {
                    return rejectMap[p].indexOf(n) != -1;
                });
                if (rl.indexOf(p) != -1 && conj.length > 0)
                {
                    reject = true;
                }
            });
            if (!reject)
            {
                result.push(r);
            }
        }
    });
    return result;
};

module.exports.FuzzyTagName = function(tag)
{
    return tag.replace(/#\d+/g, '').replace(/\([^\)]*\)/g, '').replace(/^[\~\-]+/g, '').replace(/[@#\$%\^\&\*\(\)\=]/g, '');
};

module.exports.FindBracketTags = function(str)
{
    return LoadLists().then(function()
    {
        var reg = new RegExp(/\[([^\]]+)\]/g);
        var results = [];
        var match;
        do
        {
            match = reg.exec(str);
            if (match != null)
            {
                var t = match[1];
                var tl = t.toLowerCase();
                var tlns = tl.replace(/\s+/g, '');
                var newTags;
                if (str.indexOf(t) > 0 && tl.indexOf("from ") == -1 && tl.indexOf("x-post ") == -1 && tl.indexOf('xpost') == -1)
                {
                    if (tl.indexOf(' x ') != -1)
                    {
                        newTags = results.concat(t.split(' x ')).concat(t.split(' X '));
                    }
                    else if (t.indexOf('/') != -1 && tlns.indexOf('fate/') == -1)
                    {
                        newTags = results.concat(t.split('/'));
                    }
                    else
                    {
                        newTags = results.concat(t.split(','));
                    }
                    newTags = newTags.map(function(t)
                    {
                        var tl = t.toLowerCase();
                        if (tl.indexOf("from ") == -1 && tl.indexOf("x-post ") == -1 && tl.indexOf('xpost') == -1)
                        {
                            var res = nameSet.get(t);
                            if (res != null && res.length > 0)
                            {
                                if (res[0][0] >= 0.6)
                                {
                                    res = module.exports.GetStdTag(res[0][1]);
                                    return res;
                                }
                            }
                        }
                        return null;
                    }).filter(function(t)
                    {
                        return t != null;
                    });
                    results = results.concat(newTags);
                }
            }
        } while (match != null);
        return results.map(function(t)
        {
            return t.trim();
        });
    });
};

module.exports.TagScan = function(tagAlg, tagBlob)
{
    return Promise.resolve(module.exports.FindBracketTags(tagBlob));
};

LoadLists();