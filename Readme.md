# Disbott Radio

## A quick MVP for adding a radio (Youtube/LocalFile Streamer) to your discord server.

### Setup

* Make a bot account on Discord Dev Application to get a token
* Clone repo
* Copy `.env.example` to an `.env` file in the root and fill with the details you need/want.
* Make sure the server that you want the bot on has a text and voice channel with the names you set in the `.env` file
* Add songs to a folder you described in the `.env` file
* Connect the bot to your server using the OAuth Flow
* Start the bot with `npm run start`

### Commands

The bot needs to be started via `@botname start` if it's not playing and you have files locally.

You can add songs and see the playlist by going to the website you set in `.env`. Here you can request youtube videos to listen to.

On Discord itself @ the bot within the radio channel with the commands `@botname request {youtubeUrl}` or `@botname play {youtubeUrl}` to add the youtubeUrl to the playlist. To view the playlist use `@botname playlist` though it will tell you to look at the website. If there are no songs in the playlist it will get a random song from the songs folder and play that automatically.

To skip songs use `@botname skip`

To stop the bot from playing use `@botname stop`

### Future Plans

* Integrate more sound sources (Soundcloud, etc.)
* Integrate within [Disbott](https://github.com/uchuuio/disbott)

### Contributing

This was a quick couple of days work by tomo, expect roughness, though as always glad for any assistance.