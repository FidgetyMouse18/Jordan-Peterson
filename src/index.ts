interface apiConfig {
  BOT_TOKEN: string;
  MINUTES: number;
  JOIN_CHANCE: number;
  LEAVE_SECONDS: number;
}

interface clips {
  ytLinks: string[]
}

import Discord = require("discord.js");
import DiscordVoice = require("@discordjs/voice");
import AudioPlayer from "./AudioPlayer";
import path = require('path');

let servers = {};

const config: apiConfig = require("../config/api.json");
const clips: clips = require("../config/clips.json");
const client = new Discord.Client({
  intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES", "GUILD_MEMBERS"],
});

function createAudioPlayer(param: string, channelId: string, guild: Discord.Guild) {
  //@ts-ignore
  if (servers[guild.id]) {
    //@ts-ignore
    servers[guild.id].queue(param);
  } else {
    const connection = DiscordVoice.joinVoiceChannel({
      channelId: channelId,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });
    let audio = new AudioPlayer(
      guild.id,
      param,
      connection
    );
    //@ts-ignore
    servers[guild.id] = audio;
    audio.onDisconnect((guildId) => {
      //@ts-ignore
      delete servers[guildId];
    });
  }
}

async function leaveTimer(guildId: string) {
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  await sleep(config.LEAVE_SECONDS * 1000);
  //@ts-ignore
  servers[guildId].leave();
}

client
  .login(config.BOT_TOKEN)
  .then(() => {
    console.log("Bot Successfully Logged In.");
    const the_interval = config.MINUTES * 60 * 1000;
    setInterval(function() {
      console.log("rolling chance")
      client.guilds.cache.forEach((guild) => {
        for (let [_, channel] of guild.channels.cache) {
          if (channel.isVoice() && channel.members.size > 0) {
            const x = Math.random();
            console.log(x)
            if (x <= (config.JOIN_CHANCE/100)) {
              const x = Math.random();
              const randomVid = Math.floor(x * clips.ytLinks.length);
              const vid = clips.ytLinks[randomVid];
              createAudioPlayer(vid, channel.id, guild);
              leaveTimer(guild.id);
            }
            break
          }
        }
      })
    }, the_interval);
  })
  .catch((er) => {
    console.log("Bot Failed to Login.");
    console.log(er);
  });
