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

//console.log(module.exports.FindBracketTags('Making a ponytail [Idolmaster][CindGirls]'));
