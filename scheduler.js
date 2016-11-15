var fb = require('fb');
var client = require('redis').createClient(process.env.REDIS_URL);

function getEvents(data) {
    var json = data.map(function(value) {
        var item = {
            id: value.id,
            title: value.name,
            when: value.start_time,
            where: {
                name: value.place.name,
            },
            image: {
                url: value.cover.source,
                alt: value.name,
            },
        };

        if (value.place.location) {
            item.where.latitude = value.place.location.latitude;
            item.where.longitude = value.place.location.longitude;
        }

        if (value.place.name === 'CPSalsa') {
            item.where.name = 'Cal Poly Bld 5 Rm 225'
        }

        return item;
    });

    // confine to the dates past the current
    var now = new Date();
    var events = [];

    for (var i = 0; i < json.length; i++) {
        var event = json[i];
        var date = new Date(event.when);
        if (date >= now) {
            events.push(event);
        }
    }

    return events;
}

function rewriteEvents() {
    // first connect to facebook
    fb.api('oauth/access_token', {
        client_id: process.env.FB_ID,
        client_secret: process.env.FB_SECRET,
        grant_type: 'client_credentials',
    }, function(res) {
        if(!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }

        fb.setAccessToken(res.access_token);

        // then get the events
        fb.api('v2.8/cpsalsa/events', { fields: ['id', 'name', 'place', 'cover', 'start_time'] }, function(res) {
            if(!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                return;
            }

            var events = getEvents(res.data);
            client.flushdb();

            for (var i = 0; i < events.length; i++) {
                var event = events[i],
                    key = 'event:' + event.id;

                client.set(key, JSON.stringify(event));
                client.rpush('events', event.id);
            }

            client.quit();
        });
    });
}

rewriteEvents();