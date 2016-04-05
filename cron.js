var Promise = require('bluebird');
var redis = require('redis');
var RedditParser = require('./parser_reddit');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var tick = 0;

function Update()
{
    tick++;

    var redisClient = redis.createClient(6379, 'db.lizen.org');

    if (tick % (60 * 5) == 0)
    {
        console.log("Running data fetch");
        RedditParser.Run(redisClient);
    }

    redisClient.end();

    if (tick >= 60 * 60)
    {
        tick = 0;
    }
}

setInterval(Update, 1000);