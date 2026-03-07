const { SlashCommandBuilder } = require("discord.js");
const { removeAgrAdmin, isAgrAdmin } = require("../utils/agrAdminManager");

module.exports = {
  name: "removeagradmin",
  description: "Revoke AGR Admin permissions (Level 7) from a user.",
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName("removeagradmin")
    .setDescription("Revoke AGR Admin permissions from a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to revoke")
        .setRequired(true),
    ),

  async execute(message, args) {
    let userId = args[0];
    if (message.mentions.users.size > 0) {
      userId = message.mentions.users.first().id;
    } else if (userId) {
      userId = userId.replace(/[<@!>]/g, "");
    }

    if (!userId || !/^\d+$/.test(userId)) {
      return message.reply("❗ Please provide a valid User ID or Mention.");
    }

    if (removeAgrAdmin(userId)) {
      message.reply(
        `✅ Successfully removed <@${userId}> from AGR Admin list.`,
      );
    } else {
      message.reply(`⚠️ <@${userId}> is not an AGR Admin.`);
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser("user");

    if (removeAgrAdmin(user.id)) {
      return interaction.reply(
        `✅ Successfully removed ${user.tag} from AGR Admin list.`,
      );
    } else {
      return interaction.reply({
        content: `⚠️ ${user.tag} is not an AGR Admin.`,
        ephemeral: true,
      });
    }
  },
};
