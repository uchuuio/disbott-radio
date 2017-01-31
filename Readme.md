# Disbott Radio

## A quick MVP for adding a radio (Youtube Streamer) to your discord server.

### Setup

* Make a bot account on Discord Dev Application to get a token
* Clone repo
* Copy `.env.example` to an `.env` file in the root and fill with the details you need/want.
* Make sure the server that you want the bot on has a text and voice channel called `radio`
* Connect the bot to your server using the OAuth Flow
* Start the bot with `npm run start`

### Commands

You can add songs and see the playlist by going to http://localhost:3000. Here you can request youtube videos to listen to.

On Discord itself @ the bot within the radio channel with the commands `@botname request {youtubeUrl}` or `@botname play {youtubeUrl}` to add the youtubeUrl to the playlist. To view the playlist use `@botname playlist` though it will tell you to look at the website.

### Future Plans

* Integrate more sound sources (Local Files, Soundcloud, etc.)
* Skip songs
* Integrate within [Disbott](https://github.com/uchuuio/disbott)

### Contributing

This was a quick days work by tomo, expect roughness, though as always glad for any assistance.