module.exports.everyOther = function(index, amount, scope)
{
    if (index++ % amount)
        return scope.inverse(this);
    else
        return scope.fn(this);
};

module.exports.add = function(a, b)
{
    return a + b;
};

module.exports.join = function(lst)
{
    return lst.join(', ');
};

module.exports.ifEq = function(v1, v2, options)
{
    if (v1 === v2)
    {
        return options.fn(this);
    }
    return options.inverse(this);
};

module.exports.selectActive = function(a, b)
{
    if (a == null || b == null)
    {
        return '';
    }
    else
    {
        return a == b ? 'active' : '';
    }
};

module.exports.selectText = function(a, b, trueText, falseText)
{
    if (a == null || b == null)
    {
        return falseText;
    }
    else
    {
        return a == b ? trueText : falseText;
    }
};

module.exports.encodeURI = encodeURIComponent;