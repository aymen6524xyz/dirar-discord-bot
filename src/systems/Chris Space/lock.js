const { PermissionsBitField } = require("discord.js");
const config = require("../../config/env");

module.exports = {
  name: "lock",
  description: "Locks Chris's Space for everyone",
  async execute(message, args) {
    if (!config.ownerIds.includes(message.author.id)) return;

    const channel = message.member.voice.channel;
    if (!channel || channel.name !== "Chris's Space") {
      return message.reply("❌ You must be in Chris's Space to use this.");
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.id, {
        Connect: false,
      });
      message.reply("🔒 **Locked** Chris's Space.");
    } catch (e) {
      console.error(e);
      message.reply("❌ Failed to lock channel.");
    }
  },
};
