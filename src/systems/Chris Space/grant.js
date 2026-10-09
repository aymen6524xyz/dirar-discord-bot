const config = require("../../config/env");

module.exports = {
  name: "grant",
  description: "Grants a user access to Chris's Space",
  aliases: ["allow"],
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
      await channel.permissionOverwrites.edit(target.id, {
        Connect: true,
        ViewChannel: true, // Ensure they can see it too
      });
      message.reply(`✅ Granted access to **${target.user.username}**.`);
    } catch (e) {
      console.error(e);
      message.reply("❌ Failed to grant access.");
    }
  },
};
