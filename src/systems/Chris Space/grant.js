const { PermissionsBitField } = require("discord.js");
const config = require("../../config/env");

module.exports = {
  name: "grant",
  description: "Grants a user access to Chris's Space",
  aliases: ["allow"],
  perms: 8,
  async execute(message, args) {
    if (!config.ownerIds.includes(message.author.id)) return;

    const channel = message.member.voice.channel;
    if (!channel || channel.name !== "Chris's Space") {
      return message.reply("❌ You must be in Chris's Space to use this.");
    }

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
