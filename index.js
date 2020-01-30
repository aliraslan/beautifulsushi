'use strict';
const Discord = require('discord.js');
const axios = require('axios');
const ytdl = require('ytdl-core');
const client = new Discord.Client();
let dispatches = [];
const sendUnsplash = async message => {
  await message.channel.send({
    files: [
      {
        attachment: 'https://source.unsplash.com/random/?sushi',
        name: 'beautifulsushi.jpeg'
      }
    ]
  });
};

const playMusic = async message => {
  try {
    const text = message.content.toLowerCase();
    const { voiceChannel } = message.member;
    if (!voiceChannel)
      return message.reply('Please join a voice channel first!');
    if (text.includes('play')) {
      if (dispatches.length) {
        const dispatcher = dispatches.pop();
        dispatcher.destroy();
        dispatches = [];
      }
      const searchString = text.substring(text.indexOf('play') + 5);
      const api = {
        baseUrl: 'https://www.googleapis.com/youtube/v3/search?',
        part: 'snippet',
        type: 'video',
        order: 'relevance',
        maxResults: 1,
        q: searchString,
        key: process.env.KEY
      };
      const apiUrl = `${api.baseUrl}part=${api.part}&type=${api.type}&maxResults=${api.maxResults}&order=${api.order}&q=${api.q}&key=${api.key}`;
      const res = await axios.get(apiUrl);
      const videoId = res.data.items[0].id.videoId;
      voiceChannel.join().then(connection => {
        const playingEmbed = new Discord.RichEmbed()
          .setColor('#aa0000')
          .setTitle(`${res.data.items[0].snippet.title}`)
          .setURL(`https://www.youtube.com/watch?v=${videoId}`)
          .setThumbnail(`${res.data.items[0].snippet.thumbnails.medium.url}`)
          .setImage(`${res.data.items[0].snippet.thumbnails.medium.url}`)
          .setTimestamp();
        message.channel.send(playingEmbed);
        const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, {
          filter: 'audioonly'
        });
        if (dispatches.length) dispatches.pop();
        const dispatcher = connection.playStream(stream);
        dispatches.push(dispatcher);
        dispatcher.on('end', () => {
          dispatcher.destroy();
          dispatches = [];
          voiceChannel.leave();
        });
      });
    } else if (text.includes('stop')) {
      if (dispatches.length) {
        const dispatcher = dispatches.pop();
        dispatcher.destroy();
        dispatches = [];
      }
    }
  } catch (error) {
    console.log(error);
  }
};

client.on('message', async message => {
  try {
    const text = message.content.toLowerCase();
    if (text.includes(process.env.KEYWORD)) {
      if (
        text.includes('play') ||
        text.includes('pause') ||
        text.includes('stop')
      )
        await playMusic(message);
      else await sendUnsplash(message);
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
