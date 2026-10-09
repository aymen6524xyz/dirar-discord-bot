const config = require("../../config/env");

module.exports = {
  name: "deny",
  description: "Denies a user access to Chris's Space",
  aliases: ["revoke", "remove"],
  perms: 8,
  async execute(message, args) {
    if (!config.ownerIds.includes(message.author.id)) {
      return message.reply("❌ You are not authorized to use this command.");
    }

    const channel = message.guild.channels.cache.find(
      (candidate) => candidate.name === "Chris's Space" && candidate.isVoiceBased(),
    );
    if (!channel) return message.reply("❌ Chris's Space is not active.");

    const target =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]);
    if (!target)
      return message.reply("❗ Please mention a user or provide an ID.");

    try {
      // We can either set false, or just delete the overwrite if we want to reset them to 'locked' state (if channel is locked)
      // But 'deny' implies explicit ban from channel usually.
      // Let's sets Connect: false
      await channel.permissionOverwrites.edit(target.id, {
        Connect: false,
      });
      message.reply(`🚫 Denied access to **${target.user.username}**.`);
    } catch (e) {
      console.error(e);
      message.reply("❌ Failed to deny access.");
    }
  },
};
