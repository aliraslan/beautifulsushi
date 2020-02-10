// Enable strict JavaScript mode to enforce proper code.
'use strict';

// IMPORTS
const Discord = require('discord.js');
const axios = require('axios');
const ytdl = require('ytdl-core');

// Initialization
const client = new Discord.Client();
/**
 * @description Holds all the current locations where the bot is connected
 */
const dispatches = new Set();
const songQueue = new Set();
const helpMessage = async message => {
  const reply = `Hey! These are the commands!\n\`sushi\`: Shows a random picture of sushi.\n\`sushi show me search term\` or \`sushi send search term\`: Shows a picture fitting search term.\n\`sushi play\`: Plays some piano music.\n\`sushi play something\`: Searches for 'something' on YouTube and plays that.\n\`sushi stop\`: Stops any playing music.`;
  message.channel.send(reply);
};

/**
 * @description Takes a discord message and asynchronously replies to it with a random photo of sushi from Unsplash.
 * @param {DiscordMessage} message
 */
const sendUnsplash = async message => {
  const text = message.content.toLowerCase();
  const searchTerm = text.includes('sushi show me ')
    ? text
        .substring(text.indexOf('sushi show me ') + 'sushi show me '.length)
        .split(' ')
        .join(',')
    : text.includes('sushi send ')
    ? text
        .substring(text.indexOf('sushi send ') + 'sushi send '.length)
        .split(' ')
        .join(',')
    : 'sushi';
  await message.channel.send({
    files: [
      {
        attachment: `https://source.unsplash.com/random/?${searchTerm}`,
        name: 'beautifulsushi.jpeg'
      }
    ]
  });
};

/**
 * @description Takes a discord message and asynchronously plays music from YouTube
 * @param {DiscordMessage} message
 */
const playMusic = async message => {
  try {
    // Normalize message content
    const text = message.content.toLowerCase();
    // Get the targeted voice channel
    const { voiceChannel } = message.member;
    // If the user isn't a voice channel
    if (!voiceChannel)
      return message.reply('Please join a voice channel first!');

    // Parsing the command
    if (text.includes('play')) {
      // Check if already playing and clear
      if (dispatches.length) {
        const dispatcher = dispatches.pop();
        dispatcher.destroy();
        dispatches.clear();
      }
      // Extract search string from command, if none is found play some jazz.
      const searchString =
        text === 'sushi play' || text.includes('play sushi')
          ? 'late night piano'
          : text.substring(text.indexOf('play') + 5);
      /**
       * @description Holds the data for the YouTube API
       * @property {baseUrl}: The base URL for the YouTube API
       * @property {part}: The video identifier
       * @property {type}: What to search for
       * @property {order}: Sorting order for the results
       * @property {maxResults}: Number of results to return
       * @property {q}: The search string
       * @property {key}: YouTube API Key
       */
      const api = {
        baseUrl: 'https://www.googleapis.com/youtube/v3/search?',
        part: 'snippet',
        type: 'video',
        order: 'relevance',
        maxResults: 1,
        q: searchString,
        key: process.env.KEY
      };
      // Forming the URL from the properties.
      const apiUrl = `${api.baseUrl}part=${api.part}&type=${api.type}&maxResults=${api.maxResults}&order=${api.order}&q=${api.q}&key=${api.key}`;
      // Querying the URL to return the video(s).
      const response = await axios.get(apiUrl);
      // Extract first video object
      const video = response.data.items[0];
      // Add video to queue
      songQueue.add(video);
      do {
        const currentlyPlaying = songQueue[0];
        songQueue.delete(songQueue[0]);
        // Join the voice channel
        voiceChannel.join().then(connection => {
          // Create a Rich Embed to reply with.
          const playingEmbed = new Discord.RichEmbed()
            .setColor('#e0aca8')
            .setTitle(`${currentlyPlaying.snippet.title}`)
            .setURL(
              `https://www.youtube.com/watch?v=${currentlyPlaying.id.videoId}`
            )
            .setImage(`${currentlyPlaying.snippet.thumbnails.medium.url}`)
            .setTimestamp();
          // Send the Embed
          message.channel.send(playingEmbed);
          // Create a youtube-dl stream to play
          const stream = ytdl(
            `https://www.youtube.com/watch?v=${currentlyPlaying.id.videoId}`,
            {
              filter: 'audioonly'
            }
          );
          // Start playing the music.
          const dispatcher = connection.playStream(stream);
          client.user.setActivity(`${currentlyPlaying.snippet.title}`);
          // Tracking the current dispatched stream in dispatches array.
          dispatches.add(dispatcher);
          // When song ends, leave.
          dispatcher.on('end', () => {
            // remove
            if (songQueue.size > 0) {
              songQueue.splice(0, 1);
              const queue = `The current queue is`;
              songQueue.forEach((song, index) => {
                queue.concat(`\n${index} - ${song.snippet.title}`);
              });
              message.reply(queue);
            } else {
              dispatcher.destroy();
              dispatches.clear();
              voiceChannel.leave();
              client.user.setActivity('世界一周', { type: 'WATCHING' });
            }
          });
        });
      } while (songQueue.size > 1);
    } else if (text.includes('stop')) {
      // Kill dispatch
      if (dispatches.length) {
        songQueue = [];
        const dispatcher = dispatches.pop();
        dispatcher.destroy();
        dispatches = [];
        client.user.setActivity('世界一周', { type: 'WATCHING' });
      }
    } else if (text.includes('queue')) {
      if (!songQueue.size) {
        message.reply('The queue is currently empty.');
      } else {
        const queue = `The current queue is`;
        songQueue.forEach((song, index) => {
          queue.concat(`\n${index} - ${song.snippet.title}`);
        });
        message.reply(queue);
      }
    }
  } catch (error) {
    console.log(error);
  }
};

client.on('message', async message => {
  try {
    if (message.author.id !== client.user.id) {
      const text = message.content.toLowerCase();
      if (text.includes(process.env.KEYWORD)) {
        if (text.includes('help')) await helpMessage(message);
        else if (text.includes('play') || text.includes('stop'))
          await playMusic(message);
        else await sendUnsplash(message);
      }
    }
  } catch (error) {
    console.log(error);
  }
});

client.on('ready', () => {
  console.log('Connected as ' + client.user.tag);
  client.user.setActivity('世界一周', { type: 'WATCHING' });
  dispatches.clear();
  songQueue.clear();
});

process.on('unhandledRejection', error =>
  console.error('Uncaught Promise Rejection', error)
);

client.login(process.env.BOT_TOKEN);
