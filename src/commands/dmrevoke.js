const { SlashCommandBuilder } = require("discord.js");
const { removeAllowedUser, isVip } = require("../utils/dmChatManager");

module.exports = {
  name: "dmrevoke",
  description: "Revoke DM Chat permission from a user",
  perms: 8,
  data: new SlashCommandBuilder()
    .setName("dmrevoke")
    .setDescription("Revoke DM Chat permission from a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to revoke")
        .setRequired(true),
    ),

  async execute(message, args) {
    if (!isVip(message.author.id)) {
      return message.reply(
        "⛔ You are not authorized to manage DM Chat permissions.",
      );
    }

    const userId = args[0]?.replace(/[<@!>]/g, "");
    if (!userId)
      return message.reply("❗ Usage: `d?dmrevoke <user_id/mention>`");

    try {
      const user = await message.client.users.fetch(userId); // Just to verify ID format, or just use string
      if (removeAllowedUser(userId)) {
        message.reply(
          `✅ Removed **${user ? user.tag : userId}** from allowed list.`,
        );
      } else {
        message.reply(`⚠️ User was not in the allowed list.`);
      }
    } catch (e) {
      if (removeAllowedUser(userId)) {
        message.reply(`✅ Removed ID **${userId}** from allowed list.`);
      } else {
        message.reply(`⚠️ User ID not found in allow list.`);
      }
    }
  },

  async executeSlash(interaction) {
    if (!isVip(interaction.user.id)) {
      return interaction.reply({
        content: "⛔ You are not authorized to manage DM Chat permissions.",
        ephemeral: true,
      });
    }

    const user = interaction.options.getUser("user");
    if (removeAllowedUser(user.id)) {
      interaction.reply(`✅ Removed **${user.tag}** from allowed list.`);
    } else {
      interaction.reply(`⚠️ User was not in the allowed list.`);
    }
  },
};
