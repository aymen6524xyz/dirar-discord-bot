const {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require("@discordjs/voice");
const { spawn } = require("child_process");
const ffmpegPath = require("ffmpeg-static");
const play = require("play-dl");

class GuildMusicManager {
  constructor(guildId) {
    this.guildId = guildId;
    this.queue = [];
    this.current = null;
    this.ffmpeg = null;
    this.playbackGeneration = 0;
    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.player.on(AudioPlayerStatus.Idle, () => this.playNext().catch((error) => {
      console.error(`[music:${this.guildId}] Failed to play next track:`, error);
    }));
    this.player.on("error", (error) => {
      console.error(`[music:${this.guildId}] Audio player error:`, error);
      this.player.stop();
    });
  }

  async connect(channel) {
    if (!channel || !channel.isVoiceBased()) {
      throw new Error("You must be in a voice channel.");
    }
    if (!this.connection || this.connection.joinConfig.channelId !== channel.id) {
      if (this.connection) this.connection.destroy();
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: this.guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: true,
      });
      const connection = this.connection;
      connection.on(VoiceConnectionStatus.Disconnected, () => {
        if (this.connection === connection) this.stop();
      });
    }
    await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
    this.connection.subscribe(this.player);
  }

  async enqueue(track, channel) {
    await this.connect(channel);
    this.queue.push(track);
    if (!this.current && this.player.state.status === AudioPlayerStatus.Idle) {
      await this.playNext();
    }
    return this.queue.length + (this.current ? 1 : 0);
  }

  async playNext() {
    const next = this.queue.shift();
    if (!next) {
      this.current = null;
      return;
    }
    this.current = next;
    const generation = this.playbackGeneration;
    try {
      const source = await play.stream(next.url, { quality: 2 });
      if (this.current !== next || this.playbackGeneration !== generation) {
        source.stream.destroy();
        return;
      }

      // Normalize every extractor format to raw PCM through the bundled FFmpeg.
      const ffmpeg = spawn(ffmpegPath, [
        "-hide_banner", "-loglevel", "error", "-i", "pipe:0",
        "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1",
      ], { stdio: ["pipe", "pipe", "pipe"] });
      this.ffmpeg = ffmpeg;
      source.stream.on("error", (error) => ffmpeg.emit("error", error));
      source.stream.pipe(ffmpeg.stdin);
      ffmpeg.once("error", (error) => {
        console.error(`[music:${this.guildId}] FFmpeg error:`, error);
        this.player.stop();
      });
      ffmpeg.once("close", () => {
        if (this.ffmpeg === ffmpeg) this.ffmpeg = null;
      });
      const resource = createAudioResource(ffmpeg.stdout, { inputType: "raw" });
      this.player.play(resource);
    } catch (error) {
      this.current = null;
      console.error(`[music:${this.guildId}] Failed to stream "${next.title}":`, error);
      await this.playNext();
    }
  }

  skip() {
    if (!this.current) return false;
    this.player.stop(true);
    return true;
  }

  stop() {
    this.playbackGeneration += 1;
    this.queue = [];
    this.current = null;
    this.player.stop(true);
    if (this.ffmpeg) {
      this.ffmpeg.kill();
      this.ffmpeg = null;
    }
    const connection = this.connection;
    this.connection = null;
    if (connection) connection.destroy();
  }

  disconnect() {
    this.stop();
  }

  status() {
    return {
      current: this.current,
      queue: [...this.queue],
      connected: Boolean(this.connection),
      playing: this.player.state.status === AudioPlayerStatus.Playing,
    };
  }
}

const managers = new Map();
function getMusicManager(guildId) {
  if (!managers.has(guildId)) managers.set(guildId, new GuildMusicManager(guildId));
  return managers.get(guildId);
}

function destroyMusicManager(guildId) {
  const manager = managers.get(guildId);
  if (manager) manager.stop();
  managers.delete(guildId);
}

module.exports = { GuildMusicManager, getMusicManager, destroyMusicManager };
