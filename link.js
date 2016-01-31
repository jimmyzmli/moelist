module.exports.IsLinkValid = function(fname)
{
    var ext = fname.split('.').pop();
    if (['jpeg', 'jpg', 'png', 'gif', 'bmp'].indexOf(ext.toLowerCase()) !== -1)
    {
        return true;
    }
    else
    {
        return false;
    }

};

//console.log(module.exports.IsLinkValid('http://imgur.com/random.gifv'));
