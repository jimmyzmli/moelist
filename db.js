var http = require('http');
var Promise = require('bluebird');
var linkfilter = require('./linkfilter');

var DB = function(redis)
{
	this.redisClient = redis;
};

DB.prototype.DeleteLink = function(link)
{
	// Remove link from tags
	return this.redisClient
	           .smembersAsync('link:[' + link + ']:tags')
	           .then(function(tags)
	                 {
		                 var promises = [];
		                 for (var i in tags)
		                 {
			                 promises.push(this.redisClient.sremAsync('tag:[' + tags[i] + ']:links', link));
		                 }
		                 return Promise.all(promises);
	                 })
				.then(function()
				      {
					      var promises = [];
					      promises.push(this.redisClient.delAsync('link:['+link+']:tags'));
					      promises.push(this.redisClient.delAsync('link:['+link+']:meta'));
					      promises.push(this.redisClient.delAsync('link:['+link+']:t'));
					      promises.push(this.redisClient.sremAsync('tag:[all]:links', link));
					      return Promise.all(promises);
				      });
};

module.exports = DB;