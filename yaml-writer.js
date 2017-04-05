var git = require('simple-git')();
var yaml = require('node-yaml');
var fb = require('fb');
var fs = require('fs');

var path = 'cpsalsa-site';

function getEvents(data) {
    var now = new Date();

    var events = data.filter(function(event) {
        var date = new Date(event.start_time);
        if (date >= now) {
            return true;
        }

        return false;
    }).map(function(value) {
        var item = {
            id: value.id,
            title: value.name,
            when: value.start_time,
        };

        if (value.place) {
            item.where = {
                name: value.place.name,
            };

            if (value.place.location) {
                item.where.latitude = value.place.location.latitude;
                item.where.longitude = value.place.location.longitude;
            }

            if (value.place.name === 'CPSalsa') {
                item.where.name = 'Cal Poly Bld 5 Rm 225'
            }
        }

        if (value.cover) {
            item.image = {
                url: value.cover.source,
                alt: value.name,
            };
        } else {
            item.image = {
                url: '/images/hero-back1.jpg',
            };
        }

        return item;
    });

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

            // now parse and write to yaml
            var events = getEvents(res.data);
            if (events.length > 0) {
                yaml.writeSync(path + '/_data/events.yml', events == null ? { } : events);
                fs.readFile(path + '/_data/events.yml', { encoding: 'utf8' }, function(err, data) {
                	console.log(data);
                })
            } else {
                var fd = fs.openSync(path + '/_data/events.yml', 'w');
                fs.writeSync(fd, "", 0);
            }

            // finally push to repo
            console.log('committing and pushing');
            // git.addConfig('user.name', process.env.USER_NAME)
            // 	.addConfig('user.email', process.env.USER_EMAIL)
            // 	.commit('Updated to latest events from facebook', '_data/events.yml', function(err, data) {
	           //  	console.log('commit error:');
	           //  	console.log(err);
	           //  	console.log('commit data:');
	           //  	console.log(data);
	           //  })
            // 	.push(['--porcelain', 'origin', 'master'], function(err, data) {
	           //  	console.log('data:');
	           //  	console.log(data);
	           //  });
        });
    });
}

try {
    fs.mkdirSync(path);

    console.log(path);
    console.log(process.env.UNAME + ':' + process.env.PASS);
    git.clone('https://'+ process.env.UNAME + ':' + process.env.PASS + '@github.com/cpsalsa/cpsalsa.github.io.git', path);
    git.cwd(path);
    git.pull(rewriteEvents);
} catch (e) {
    console.log('directory already exists');
    git.cwd(path);
    git.pull(rewriteEvents);
}