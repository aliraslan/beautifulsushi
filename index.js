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
let dispatches = [];

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
        dispatches = [];
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
      // Extract ID
      const videoId = video.id.videoId;
      // Join the voice channel
      voiceChannel.join().then(connection => {
        // Create a Rich Embed to reply with.
        const playingEmbed = new Discord.RichEmbed()
          .setColor('#e0aca8')
          .setTitle(`${video.snippet.title}`)
          .setURL(`https://www.youtube.com/watch?v=${videoId}`)
          .setImage(`${video.snippet.thumbnails.medium.url}`)
          .setTimestamp();

        // Send the Embed
        message.channel.send(playingEmbed);
        // Create a youtube-dl stream to play
        const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
          filter: 'audioonly'
        });
        // Start playing the music.
        const dispatcher = connection.playStream(stream);
        client.user.setActivity(`${video.snippet.title}`);
        // Tracking the current dispatched stream in dispatches array.
        dispatches.push(dispatcher);
        // When song ends, leave.
        dispatcher.on('end', () => {
          dispatcher.destroy();
          dispatches = [];
          voiceChannel.leave();
          client.user.setActivity('世界一周', { type: 'WATCHING' });
        });
      });
    } else if (text.includes('stop')) {
      // Kill dispatch
      if (dispatches.length) {
        const dispatcher = dispatches.pop();
        dispatcher.destroy();
        dispatches = [];
        client.user.setActivity('世界一周', { type: 'WATCHING' });
      }
    }
  } catch (error) {
    console.log(error);
  }
};

// const playingEmbed = new Discord.RichEmbed()
// .setColor('#e0aca8')
// .setTitle(`${video.snippet.title}`)
// .setURL(`https://www.youtube.com/watch?v=${video.id.videoId}`)
// .setImage(`${video.snippet.thumbnails.medium.url}`)
// .setTimestamp();
// // Send the Embed
// message.channel.send(playingEmbed);

const newPlayMusic = async (connection, message) => {
  const text = message.content.toLowerCase();
  if (!message.member.voiceChannel) {
    message.reply('Please join a voice channel first.');
  }
  if (text.includes('play')) {
    const searchString =
      text === 'sushi play'
        ? 'late night piano'
        : text.substring(text.indexOf('play') + 5);
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
    songQueue.add(video);
    const nextUp = songQueue[0];
    // Create a youtube-dl stream to play
    const stream = ytdl(
      `https://www.youtube.com/watch?v=${nextUp.id.videoId}`,
      {
        filter: 'audioonly'
      }
    );
    server.dispatcher = connection.playStream(stream);
    // REMOVE FROM QUEUE
    server.dispatcher.on('end', () => {
      songQueue.delete(video);
      if (songQueue.size > 0) newPlayMusic(connection, message);
      else connection.disconnect();
    });
  } else if (text.includes('queue')) {
    if (songQueue.size) {
      let queue = 'The current queue is: \n';
      songQueue.forEach((song, index) => {
        queue.concat(`\n${index + 1} - ${song.snippet.title}`);
      });
      message.reply(queue);
    }
  } else if (text.includes('stop')) {
    if (message.guild.voiceConnection) {
      songQueue.clear();
      message.guild.voiceConnection.disconnect();
    }
  }
};

client.on('message', async message => {
  try {
    if (message.author.id !== client.user.id) {
      const text = message.content.toLowerCase();
      if (text.includes(process.env.KEYWORD)) {
        if (text.includes('help')) await helpMessage(message);
        else if (
          text.includes('play') ||
          text.includes('stop') ||
          text.includes('queue') ||
          text.includes('skip')
        )
          if (!message.member.voiceChannel) {
            message.reply('You need to be in a voice channel to do that.');
          } else {
            message.member.voiceChannel
              .join()
              .then(connection => newPlayMusic(connection, message));
          }
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
  dispatches = [];
});

process.on('unhandledRejection', error =>
  console.error('Uncaught Promise Rejection', error)
);

client.login(process.env.BOT_TOKEN);
