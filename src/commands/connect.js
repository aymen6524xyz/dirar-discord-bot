const {
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
} = require("@discordjs/voice");

module.exports = {
  name: "connect",
  description: "Connect to a voice channel muted and deafened.",
  perms: 5,

  async execute(message, args) {
    if (!message.guild) {
      await message.reply("❌ This command can only be used in a server.");
      return;
    }

    const channelId = args[0];
    if (!channelId || !/^\d+$/.test(channelId)) {
      await message.reply("❗ Please provide a valid voice channel ID.");
      return;
    }

    const channel = await message.guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isVoiceBased()) {
      await message.reply("❌ That ID does not belong to a valid voice channel.");
      return;
    }

    const existingConnection = getVoiceConnection(message.guild.id);
    if (existingConnection) existingConnection.destroy();

    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: true,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
      await message.reply(`✅ Connected to <#${channel.id}> muted and deafened.`);
    } catch (error) {
      console.error(`Failed to connect to voice channel ${channel.id}:`, error);
      const connection = getVoiceConnection(message.guild.id);
      if (connection) connection.destroy();
      await message.reply("❌ I could not connect to that voice channel. Check my Connect and Speak permissions.");
    }
  },
};
