var dotenv = require('dotenv');
dotenv.config();

if (typeof process.env.NOW_LOGS_KEY !== "undefined") {
    require('now-logs')(process.env.NOW_LOGS_KEY);
}

var fs = require('fs');

var Datastore = require('nedb');
var db = new Datastore({ filename: './db/songs.db', autoload: true });

var express = require('express');
var server = express();
var bodyParser = require('body-parser');
server.use('/songs', express.static('./songs/'));
server.use(bodyParser.urlencoded({ extended: true }));
var http = require('http').Server(server);
var io = require('socket.io')(http);

var Discordie = require("discordie");
var bot = new Discordie({ autoReconnect: true });

var app = require('./app.js');

var currentSong = {};
var isPlaying = false;
var stoppedCount = 0;
function playSongBot(voiceChannels, song) {
    function nextSong() {
        isPlaying = false;
        stoppedCount = 0;
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
            });
    }

    currentSong = song;

    voiceChannels.forEach(function(voiceChannel) {
        var encoder = voiceChannel.voiceConnection.createExternalEncoder({
            type: "ffmpeg",
            source: song.audioUrl,
            outputArgs: ["-af", "volume=0.30"],
        });

        encoder.once("end", function() {
            // Remove song
            stoppedCount++;
            if (stoppedCount === voiceChannels.length) {
                nextSong();
            }
        });

        bot.User.setGame({
            name: song.title + ' -- ' + song.owner,
        });

        var encoderStream = encoder.play();
        isPlaying = true;
        encoderStream.resetTimestamp();
        encoderStream.removeAllListeners("timestamp");
        // encoderStream.on("timestamp", time => console.log("Time " + time));
    });
}

server.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

server.get('/setup', function(req, res) {
    res.sendFile(__dirname + '/setup.html');
});

server.post('/setup', function(req, res) {
    Object.keys(req.body).forEach(function(key) {
        fs.appendFileSync('./.env', "\r\n"+key.toUpperCase()+'='+req.body[key])
    });
    setTimeout(function() {
        dotenv.config();
        bot.connect({ token: process.env.DISCORD_TOKEN });
        res.redirect('/');
    }, 1000);
})

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
                    channel = guild.textChannels.find(c => c.name == process.env.RADIO_TEXT_CHANNEL);
                    channel.sendMessage('A webuser has queued ' + song.title);
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

    // WipeDB
    db.remove({}, { multi: true }, (err, numRemoved) => {});

    // Join Radio
    bot.Guilds.forEach(function(guild) {
        channel = guild.voiceChannels.find(c => c.name == process.env.RADIO_VOICE_CHANNEL);
        channel.join(false, false);
    })
});

bot.Dispatcher.on("MESSAGE_CREATE", e => {
    var wasMentioned = bot.User.isMentioned(e.message);
    var isNotBot = (e.message.author.id !== bot.User.id);
    var isRadioChannel = (e.message.channel.name === process.env.RADIO_TEXT_CHANNEL);

    if (wasMentioned && isNotBot && isRadioChannel) {
        var splitMessage = e.message.content.split(' ');
        var command = splitMessage[1];
        var url = splitMessage[2];

        if (e.message.member.roles[0].permissions.General.ADMINISTRATOR) {
            if (command == "start") {
                db.remove({}, { multi: true }, function (err, numRemoved) {
                    app.getNextSong(db)
                        .then(function(song) {
                            if (typeof song !== "undefined") {
                                var voiceChannels = bot.VoiceConnections;
                                if (!voiceChannels[0]) return console.log("Voice not connected");
                                playSongBot(voiceChannels, song);
                            }
                        });
                });
            }

            if (command == "skip") {
                // Stop Current Song and go to next
                app.stopPlaying(bot);
                app.removeCurrentSong(db, currentSong._id)
                    .then(function(_id) {
                        io.emit('removeSong', _id);

                        app.getNextSong(db)
                            .then(function(song) {
                                if (typeof song !== "undefined") {
                                    io.emit('addedSong', song);
                                    var voiceChannels = bot.VoiceConnections;
                                    if (!voiceChannels[0]) return console.log("Voice not connected");
                                    playSongBot(voiceChannels, song);
                                }
                            });
                    });
            }

            if (command == "stop") {
                app.stopPlaying(bot);
                e.message.channel.sendMessage('Stopping...');
            }

            if (command == "kys") {
                app.stopPlaying(bot);
                bot.disconnect();
                process.exit(0);
            }
        }

        if (command == "request" || command == "play") {
            app.addUrl(url, db)
                .then(function(song) {
                    // Send song to website & bot
                    io.emit('addedSong', song);

                    bot.Guilds.forEach(function(guild) {
                        var username = e.message.author.username;
                        channel = guild.textChannels.find(c => c.name == process.env.RADIO_TEXT_CHANNEL);
                        channel.sendMessage(username + ' has queued' + song.title);
                    });

                    db.find({}, function (err, songs) {
                        if (songs.length <= 1 || !isPlaying) {
                            var voiceChannels = bot.VoiceConnections;
                            if (!voiceChannels[0]) return console.log("Voice not connected");
                            playSongBot(voiceChannels, song);
                        }
                    });
                });
        }

        if (command == "current") {
            e.message.channel.sendMessage('**Currently Playing:** ' + currentSong.title + ' -- ' + currentSong.owner);
        }

        if (command == "playlist") {
            e.message.channel.sendMessage('Visit '+process.env.WEBSITE+' to see the full playlist');
        }
    }
});

http.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});