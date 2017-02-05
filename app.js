const fs = require('fs');

const moment = require('moment');
require("moment-duration-format");

const getYouTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const youtubeStream = require('youtube-audio-stream');

function getRandLocalSong() {
    const files = fs.readdirSync('./songs/');
    const chosenSong = files[Math.floor(Math.random() * files.length)];
}

exports.addUrl = function (url, db, io, bot) {
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

                    // Send song to website & bot
                    io.emit('addedSong', song);

                    bot.Guilds.forEach(function(guild) {
                        channel = guild.textChannels.find(c => c.name == "radio");
                        channel.sendMessage(song.title + ' has been queued');
                    })

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
            console.log(nextSong);
            if (typeof nextSong === "undefined") {
                // Get a random song from local files
                nextSong = getRandLocalSong();
            }
            resolve(nextSong);
        });
    })
}