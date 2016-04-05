var Promise = require('bluebird');
var redis = require('redis');
var RedditParser = require('./parser_reddit');

Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

var tick = 0;

function Update()
{
    var redisClient = redis.createClient(6379, 'db.lizen.org');
    var pid = (new Date()).getTime();

    if (tick % (60 * 5) == 0)
    {
        console.log("Running data fetch (" + pid + ")");
        RedditParser
            .Run(redisClient)
            .then(function()
            {
                console.log("Done (" + pid + ")");
                redisClient.end();
            })
            .catch(console.log);
    }

    if (tick >= 60 * 60)
    {
        tick = 0;
    }

    tick++;
}

setInterval(Update, 1000);