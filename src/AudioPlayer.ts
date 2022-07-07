import Opus = require("@discordjs/opus");
import ytdl = require("ytdl-core");
import Discord = require("discord.js");
import DiscordVoice = require("@discordjs/voice");

export default class AudioPlayer {
  _guildID: string;
  _queue: Array<string>;
  _player: DiscordVoice.AudioPlayer;
  _subscription: DiscordVoice.PlayerSubscription | undefined;
  _connection: DiscordVoice.VoiceConnection;
  paused: boolean;
  private handlers: Array<(guildID: string) => void> = [];

  constructor(
    guildID: string,
    firstUrl: string,
    connection: DiscordVoice.VoiceConnection,
  ) {
    this._guildID = guildID;
    this._queue = [firstUrl];
    this._connection = connection;
    this.paused = false;

    this._player = DiscordVoice.createAudioPlayer({
      behaviors: {
        noSubscriber: DiscordVoice.NoSubscriberBehavior.Play,
      },
    });
    this._subscription = connection.subscribe(this._player);
    this.play();
    this._player.on(DiscordVoice.AudioPlayerStatus.Idle, () => {
      this._queue.shift();
      if (this._queue.length > 0) {
        this.play();
      } else {
        this.leave();
      }
    });
  }

  sec2time(timeInSeconds: string) {
    var pad = function (num: number, size: number) {
        return ("000" + num).slice(size * -1);
      },
      time: number = parseFloat(timeInSeconds),
      hours = Math.floor(time / 60 / 60),
      minutes = Math.floor(time / 60) % 60,
      seconds = Math.floor(time - minutes * 60);

    return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2);
  }

  public onDisconnect(handler: (guildID: string) => void): void {
    this.handlers.push(handler);
  }

  public trigger(guildID: string): void {
    // Duplicate the array to avoid side effects during iteration.
    this.handlers.slice(0).forEach((h) => h(guildID));
  }

  queue(url: string) {
      ytdl.getInfo(url).then((data) => {
        this._queue.push(url);
      });
  }

  skip() {
    this._player.stop(true);
  }

  pause() {
    this.paused = true;
    this._player.pause(true);
  }

  resume() {
    this.paused = false;
    this._player.unpause();
  }

  leave() {
    try {
      this._queue = [];
      if (this._connection) {
        if (this._subscription) {
          this._subscription.unsubscribe();
        }
        this._connection.destroy();
        this.trigger(this._guildID);
      }
    } catch {}
  }

  play() {
    if (ytdl.validateURL(this._queue[0])) {
      try {
        var stream = ytdl(this._queue[0], {
          filter: "audioonly",
          highWaterMark: 1 << 25,
        });
        ytdl.getInfo(this._queue[0]).then((data) => {
          const resource = DiscordVoice.createAudioResource(stream);
          this._player.play(resource);
          this._connection.subscribe(this._player);
        });
      } catch {
      }
    }
    else {
    }
  }
}
