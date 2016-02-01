var FuzzySet = require('fuzzyset.js');
var levenshtein = require('fast-levenshtein');

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
            result.push(r);
        }
    });
    return result;
};

module.exports.FindBracketTags = function(str)
{
    var reg = new RegExp(/\[([^\]]+)\]/g);
    var results = [];
    var match;
    do
    {
        match = reg.exec(str);
        if (match != null)
        {
            results.push(match[1]);
        }
    } while (match != null);
    return results;
};

module.exports.TagScan = function(tagAlg, tagBlob)
{
    return module.exports.FindBracketTags(tagBlob);
};