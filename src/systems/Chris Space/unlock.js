const { PermissionsBitField } = require("discord.js");
const config = require("../../config/env");

module.exports = {
  name: "unlock",
  description: "Unlocks Chris's Space for everyone",
  async execute(message, args) {
    if (!config.ownerIds.includes(message.author.id)) return;

    const channel = message.member.voice.channel;
    if (!channel || channel.name !== "Chris's Space") {
      return message.reply("❌ You must be in Chris's Space to use this.");
    }

    try {
      await channel.permissionOverwrites.edit(message.guild.id, {
        Connect: null, // Reset to default (usually allows if @everyone has Connect perms in category)
      });
      message.reply("🔓 **Unlocked** Chris's Space.");
    } catch (e) {
      console.error(e);
      message.reply("❌ Failed to unlock channel.");
    }
  },
};
