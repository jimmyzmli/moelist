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

module.exports.encodeURI = encodeURIComponent;