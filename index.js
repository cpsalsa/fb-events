var express = require('express');
var app = express();
var client = require('redis').createClient(process.env.REDIS_URL);

function handleGet(index, length, events, response, error, results) {
    if (!error) {
        events.push(results);
    }

    if (index === length-1) {
        response.status(201).json(events);
    }
}

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.get('/events', function(req, res) {
    events = [];

    client.lrange('events', 0, -1, function(err, results) {
        if (!err) {
            for (var i = 0; i < results.length; i++) {
                client.get('event:' + results[i], handleGet.bind(this, i, results.length, events, res));
            }
        }
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


