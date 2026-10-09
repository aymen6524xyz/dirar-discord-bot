const config = require("../../config/env");

module.exports = {
  name: "unlock",
  description: "Unlocks Chris's Space for everyone",
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
        Connect: null, // Reset to default (usually allows if @everyone has Connect perms in category)
      });
      message.reply("🔓 **Unlocked** Chris's Space.");
    } catch (e) {
      console.error(e);
      message.reply("❌ Failed to unlock channel.");
    }
  },
};
