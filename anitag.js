

module.exports.FindBracketTags = function(str)
{
    var reg = new RegExp(/\[[^\]]+\]/g);
    var matches = str.match(reg);
    return matches;
};

//module.exports.FindBracketTags('Making a ponytail [Idolmaster][CindGirls]');
