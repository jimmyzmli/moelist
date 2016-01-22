module.exports.IsLinkValid = function(fname)
{
	var ext = fname.split('.').pop();
	if (['jpeg', 'jpg', 'png', 'gif', 'bmp', 'gifv'].indexOf(ext.toLowerCase()) !== -1)
	{
		return true;
	}
	else
	{
		return false;
	}

};

//console.log(module.exports.IsLinkValid('http://imgur.com/random.png'));
