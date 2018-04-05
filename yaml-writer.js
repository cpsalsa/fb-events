const git = require('simple-git')();
const yaml = require('node-yaml');
const fb = require('fb');
const fs = require('fs');

const path = 'cpsalsa-site';

function getEvents(data) {
    let list = [...data];

    // get the multi events and expand them out
    let multi = list.find(e => {
        return e.event_times != null;
    });

    if (multi) {
        for (let times of multi.event_times) {
            list.push({
                ...multi,
                id: times.id,
                start_time: times.start_time,
            });
        }
    }

    // sort the list by date
    list.sort((a, b) => {
        return a.start_time < b.start_time ? -1 : a.start_time > b.start_time ? 1 : 0;
    });

    // finally, convert the list to a format better suited for the yaml
    let events = list.map(value => {
        let item = {
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
    }, res => {
        if(!res || res.error) {
            console.log(!res ? 'error occurred' : res.error);
            return;
        }

        fb.setAccessToken(res.access_token);

        // then get the events
        fb.api('v2.12/cpsalsa/events', {
            fields: ['id', 'name', 'place', 'cover', 'start_time', 'event_times', 'interested_count'],
            time_filter: 'upcoming'
        }, res => {
            if(!res || res.error) {
                console.log(!res ? 'error occurred' : res.error);
                return;
            }

            // now parse and write to yaml
            let events = getEvents(res.data);

            // get the slosx events
            fb.api('v2.12/slosx/events', {
                fields: ['id', 'name', 'place', 'cover', 'start_time', 'event_times', 'interested_count'],
                time_filter: 'upcoming'
            }, res => {
                let slosxEvents = getEvents(res.data);
                let combinedEvents = [...events, ...slosxEvents];

                combinedEvents.sort((a, b) => {
                    return a.when < b.when ? -1 : a.when > b.when ? 1 : 0;
                });

                if (combinedEvents.length > 0) {
                    yaml.writeSync(path + '/_data/events.yml', combinedEvents == null ? { } : combinedEvents);
                } else {
                    let fd = fs.openSync(path + '/_data/events.yml', 'w');
                    fs.writeSync(fd, "", 0);
                }

                // finally push to repo
                console.log('committing and pushing');
                git.addConfig('user.name', process.env.USER_NAME)
                    .addConfig('user.email', process.env.USER_EMAIL)
                    .commit('Updated to latest events from facebook', '_data/events.yml', (err, data) => {
                        console.log('commit error:');
                        console.log(err);
                        console.log('commit data:');
                        console.log(data);
                    })
                    .push(['--porcelain', 'origin', 'master'], (err, data) => {
                        console.log('data:');
                        console.log(data);
                    });
            });
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