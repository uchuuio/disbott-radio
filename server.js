require('dotenv-safe').load();

require('now-logs')(process.env.NOW_LOGS_KEY);

var Datastore = require('nedb');
var db = new Datastore();

var server = require('express')();
var http = require('http').Server(server);
var io = require('socket.io')(http);

var Discordie = require("discordie");
var bot = new Discordie({ autoReconnect: true });

var ytdl = require('ytdl-core');

var app = require('./app.js');

var isPlaying = false;
function playSongBot(voiceChannels, song) {
    function nextSong() {
        isPlaying = false;
        bot.User.setGame({
            name: '',
        });
        app.removeCurrentSong(db, song._id)
            .then(function(_id) {
                io.emit('removeSong', _id);

                app.getNextSong(db)
                    .then(function(song) {
                        if (typeof song !== "undefined") {
                            playSongBot(voiceChannels, song);
                        }
                    });
            })
    }

    function onMediaInfo(err, mediaInfo) {
        if (err) return console.log("ytdl error:", err);
        // sort by bitrate, high to low; prefer webm over anything else
        var formats = mediaInfo.formats.filter(f => f.container === "webm").sort((a, b) => b.audioBitrate - a.audioBitrate);

        // get first audio-only format or fallback to non-dash video
        var bestaudio = formats.find(f => f.audioBitrate > 0 && !f.bitrate) || formats.find(f => f.audioBitrate > 0);
        if (!bestaudio) return console.log("[playRemote] No valid formats");

        voiceChannels.forEach(function(voiceChannel) {
            var encoder = voiceChannel.voiceConnection.createExternalEncoder({
                type: "ffmpeg",
                source: bestaudio.url,
                outputArgs: ["-af", "volume=0.30"],
            });
            encoder.once("end", function() {
                // Remove song
                nextSong();
            });

            bot.User.setGame({
                name: song.title,
            });

            isPlaying = true;
            var encoderStream = encoder.play();
            encoderStream.resetTimestamp();
            encoderStream.removeAllListeners("timestamp");
            // encoderStream.on("timestamp", time => console.log("Time " + time));
        })
    }
    try {
        ytdl.getInfo(song.url, onMediaInfo);
    } catch (e) { console.log("ytdl threw:", e); }
}

server.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    db.find({}, function (err, songs) {
        songs.slice(0, 10);
        io.emit('joinedSongs', songs);
    });

    socket.on('requestSong', function(url) {
        app.addUrl(url, db)
            .then(function(song) {
                // Send song to website & bot
                io.emit('addedSong', song);

                bot.Guilds.forEach(function(guild) {
                    channel = guild.textChannels.find(c => c.name == "radio");
                    channel.sendMessage(song.title + ' has been queued');
                });

                db.find({}, function (err, songs) {
                    if (songs.length <= 1 || !isPlaying) {
                        var voiceChannels = bot.VoiceConnections;
                        if (!voiceChannels[0]) return console.log("Voice not connected");
                        playSongBot(voiceChannels, song);
                    }
                });
            });
    });
});

bot.connect({ token: process.env.DISCORD_TOKEN });

bot.Dispatcher.on("GATEWAY_READY", e => {
    console.log("Connected as: " + bot.User.username);

    // Join Radio
    bot.Guilds.forEach(function(guild) {
        channel = guild.voiceChannels.find(c => c.name == "radio");
        channel.join(false, false);
    })
});

bot.Dispatcher.on("MESSAGE_CREATE", e => {
    var wasMentioned = bot.User.isMentioned(e.message);
    var isNotBot = (e.message.author.id !== bot.User.id);
    var isRadioChannel = (e.message.channel.name === 'radio');

    if (wasMentioned && isNotBot && isRadioChannel) {
        var splitMessage = e.message.content.split(' ');
        var command = splitMessage[1];
        var url = splitMessage[2];
        if (command == "request" || command == "play") {
            app.addUrl(url, db)
                .then(function(song) {
                    // Send song to website & bot
                    io.emit('addedSong', song);

                    bot.Guilds.forEach(function(guild) {
                        channel = guild.textChannels.find(c => c.name == "radio");
                        channel.sendMessage(song.title + ' has been queued');
                    });

                    db.find({}, function (err, songs) {
                        if (songs.length <= 1 || !isPlaying) {
                            var info = bot.VoiceConnections[0];
                            if (!info) return console.log("Voice not connected");
                            playSongBot(info, song);
                        }
                    });
                });
        }
        if (command == "playlist") {
            e.message.channel.sendMessage('Visit '+process.env.WEBSITE+' to see the full playlist');
        }
    }
});

bot.Dispatcher.on("VOICE_CONNECTED", e => {
    app.getNextSong(db)
        .then(function(song) {
            if (typeof song !== "undefined") {
                var info = bot.VoiceConnections[0];
                if (!info) return console.log("Voice not connected");
                playSongBot(info, song);
            }
        })
});

// bot.Dispatcher.onAny(function(type, e) {
//     var ignore = [
//         "READY",
//         "GATEWAY_READY",
//         "ANY_GATEWAY_READY",
//         "GATEWAY_DISPATCH",
//         "PRESENCE_UPDATE",
//         "TYPING_START",
//     ];
//     if(ignore.find(t => (t == type || t == e.type))) {
//         return console.log("<" + type + ">");
//     }

//     console.log("\nevent " + type);
//     return console.log("args " + JSON.stringify(e));
// });

http.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});