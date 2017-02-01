import test from 'ava';

const Datastore = require('nedb');
const db = new Datastore();
import app from './app.js';

const ytVideoUrl = 'https://www.youtube.com/watch?v=4q1Zs3vbX8M';

function wipeDB() {
    db.remove({}, { multi: true }, (err, numRemoved) => {});
}

test.serial('Video Details is Correctly Fetched', t => {
    t.plan(8);
    wipeDB();
    return app.addUrl(ytVideoUrl, db).then(song => {
        t.is(song.title, 'do re mi');
        t.is(song.owner, 'bill wurtz');
        t.is(song.thumbnailUrl, 'https://i.ytimg.com/vi/4q1Zs3vbX8M/maxresdefault.jpg');
        t.is(song.datePublished, '2016-01-06');
        t.is(song.duration, 7);
        t.is(song.prettyDuration, '07');
        t.is(song.url, 'https://www.youtube.com/watch?v=4q1Zs3vbX8M');
        t.is(song.medium, 'youtube');
    });
});

test.serial('Video is added to Playlist DB', t => {
    wipeDB();
    return app.addUrl(ytVideoUrl, db).then(song => {
        db.find({}, (err, dbsongs) => {
            dbsongs.forEach((dbsong) => {
                if (dbsong.url === ytVideoUrl) {
                    t.pass();
                }
            });
            t.fail();
        });
    });
});

test.serial('Remove Current Song', t => {
    return app.addUrl(ytVideoUrl, db).then(song => {
        app.removeCurrentSong(db, song._id).then((_id) => {
            t.is(song._id, _id);
            db.find({}, (err, dbsongs) => {
                t.is(dbsongs.length, 0);
            })
        });
    });
})