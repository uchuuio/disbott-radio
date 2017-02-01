var moment = require('moment');
require("moment-duration-format");

var getYouTubeID = require('get-youtube-id');
var fetchVideoInfo = require('youtube-info');
var youtubeStream = require('youtube-audio-stream');

exports.addUrl = function (url, db) {
    return new Promise(function(resolve, reject) {
        if (url.includes('youtube') || url.includes('youtu.be')) {
            var videoId = getYouTubeID(url);
            fetchVideoInfo(videoId).then(function (videoInfo) {
                var prettyDuration = moment.duration(videoInfo.duration, 'seconds').format('mm:ss');
                var song = {
                    title: videoInfo.title,
                    description: videoInfo.description,
                    owner: videoInfo.owner,
                    thumbnailUrl: videoInfo.thumbnailUrl,
                    datePublished: videoInfo.datePublished,
                    duration: videoInfo.duration,
                    prettyDuration: prettyDuration,
                    views: videoInfo.views,
                    url: videoInfo.url,
                    medium: 'youtube'
                }
                db.insert(song, function(err, song) {
                    if (err) { throw err; }
                    resolve(song);
                })
            });
        }
    })
};

exports.removeCurrentSong = function(db, _id) {
    return new Promise(function(resolve, reject) {
        db.remove({ _id: _id }, {}, function() {});
        resolve(_id);
    })
}

exports.getNextSong = function (db) {
    return new Promise(function(resolve, reject) {
        db.find({}, function (err, songs) {
            var nextSong = songs.shift();
            resolve(nextSong);
        });
    })
}