const config = require("../../config/env");

module.exports = {
  name: "lock",
  description: "Locks Chris's Space for everyone",
  perms: 8,
  async execute(message, args) {
    if (!config.ownerIds.includes(message.author.id)) {
      return message.reply("❌ You are not authorized to use this command.");
    }

    const channel = message.guild.channels.cache.find(
      (candidate) => candidate.name === "Chris's Space" && candidate.isVoiceBased(),
    );
    if (!channel) return message.reply("❌ Chris's Space is not active.");

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
