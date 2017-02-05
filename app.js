require('dotenv').config()

const fs = require('fs');
const mm = require('musicmetadata');

const moment = require('moment');
require("moment-duration-format");

const getYouTubeID = require('get-youtube-id');
const fetchVideoInfo = require('youtube-info');
const youtubeStream = require('youtube-audio-stream');
var ytdl = require('ytdl-core');

function getRandLocalSong(db) {
    return new Promise(function(resolve, reject) {
        let files = fs.readdirSync('./songs/');
        files = files.filter(function(item) { 
            return item != '.DS_Store';
        });

        if (files.length > 0) {
            const chosenSong = files[Math.floor(Math.random() * files.length)];
            mm(fs.createReadStream('./songs/' + chosenSong), function (err, metadata) {
                if (err) throw err;
                let song = {};
                if (chosenSong === 'bgm.mp3') {
                    song = {
                        title: 'BGM',
                        owner: 'Disbott',
                        url: process.env.WEBSITE + '/songs/' + chosenSong,
                        audioUrl: './songs/' + chosenSong,
                        medium: 'local'
                    };
                } else {
                    const duration = parseInt(metadata.duration);
                    const prettyDuration = moment.duration(duration, 'seconds').format('mm:ss');
                    song = {
                        title: metadata.title,
                        album: metadata.album,
                        owner: metadata.artist[0],
                        prettyDuration: prettyDuration,
                        url: process.env.WEBSITE + '/songs/' + chosenSong,
                        audioUrl: './songs/' + chosenSong,
                        medium: 'local'
                    };
                }
                db.insert(song, function(err, song) {
                    if (err) { throw err; }
                    resolve(song);
                });
            });
        }
    })
}

exports.addUrl = function (url, db) {
    return new Promise(function(resolve, reject) {
        function onYtMediaInfo(err, mediaInfo) {
            if (err) return console.log("ytdl error:", err);
            // sort by bitrate, high to low; prefer webm over anything else
            const formats = mediaInfo.formats.filter(f => f.container === "webm").sort((a, b) => b.audioBitrate - a.audioBitrate);

            // get first audio-only format or fallback to non-dash video
            const bestaudio = formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0);
            if (!bestaudio) return console.log("[playRemote] No valid formats");

            const duration = parseInt(mediaInfo.length_seconds);
            const prettyDuration = moment.duration(duration, 'seconds').format('mm:ss');

            const song = {
                title: mediaInfo.title,
                description: mediaInfo.description,
                owner: mediaInfo.author,
                thumbnailUrl: mediaInfo.thumbnail_url,
                prettyDuration: prettyDuration,
                views: mediaInfo.view_count,
                url: 'https://www.youtube.com/watch?v=' + mediaInfo.video_id,
                audioUrl: bestaudio.url,
                medium: 'youtube'
            };
            db.insert(song, function(err, song) {
                if (err) { throw err; }
                resolve(song);
            });
        }

        if (url.includes('youtube') || url.includes('youtu.be')) {
            try {
                ytdl.getInfo(url, onYtMediaInfo);
            } catch (e) { console.log("ytdl threw:", e); }
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
            if (typeof nextSong === "undefined") {
                // Get a random song from local files
                getRandLocalSong(db).then(function(localSong) {
                    resolve(localSong);
                })
            } else {
                resolve(nextSong);
            }
        });
    })
}

exports.stopPlaying = function (bot) {
    var voiceChannels = bot.VoiceConnections;
    if (!voiceChannels[0]) return console.log("Voice not connected");
    voiceChannels.forEach(function(voiceChannel) {
        var encoderStream = voiceChannel.voiceConnection.getEncoderStream();
        encoderStream.unpipeAll();
    });
}