var express = require('express');
var app = express();
var client = require('redis').createClient(process.env.REDIS_URL);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

app.get('/events', function(req, res) {
    var events = client.lrange('events', 0, -1);
    res.status(201).json(events);
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


