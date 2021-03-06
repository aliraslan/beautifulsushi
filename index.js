// Enable strict JavaScript mode to enforce proper code.
'use strict';

// IMPORTS
const Discord = require('discord.js');
const axios = require('axios');
const ytdl = require('ytdl-core');
// Initialization
const client = new Discord.Client();

// SongQueue
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

const playMusic = async (connection, message) => {
  try {
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
      message.reply(`Alright! Playing ${video.snippet.title}.`);
      const playingEmbed = new Discord.RichEmbed()
        .setColor('#e0aca8')
        .setTitle(`${video.snippet.title}`)
        .setURL(`https://www.youtube.com/watch?v=${video.id.videoId}`)
        .setImage(`${video.snippet.thumbnails.medium.url}`)
        .setTimestamp();
      // Send the Embed
      message.channel.send(playingEmbed);
      client.user.setActivity(`${video.snippet.title}`, {
        type: 'STREAMING'
      });
      // Create a youtube-dl stream to play
      const stream = ytdl(
        `https://www.youtube.com/watch?v=${video.id.videoId}`,
        {
          filter: 'audioonly'
        }
      );
      const dispatcher = connection.playStream(stream);
      dispatcher.on('end', () => {
        client.user.setActivity('世界一周', { type: 'WATCHING' });
        connection.disconnect();
      });
    } else if (text.includes('stop')) {
      if (message.guild.voiceConnection) {
        message.guild.voiceConnection.disconnect();
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
          if (!message.member.voiceChannel) {
            message.reply('You need to be in a voice channel to do that.');
          } else {
            message.member.voiceChannel
              .join()
              .then(async connection => await playMusic(connection, message));
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
});

process.on('unhandledRejection', error =>
  console.error('Uncaught Promise Rejection', error)
);

client.login(process.env.BOT_TOKEN);
