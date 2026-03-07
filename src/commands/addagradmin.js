const { SlashCommandBuilder } = require("discord.js");
const { addAgrAdmin, isAgrAdmin } = require("../utils/agrAdminManager");

module.exports = {
  name: "addagradmin",
  description: "Grant AGR Admin permissions (Level 7) to a user.",
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName("addagradmin")
    .setDescription("Grant AGR Admin permissions to a user")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to promote")
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

    if (isAgrAdmin(userId)) {
      return message.reply(`⚠️ <@${userId}> is already an AGR Admin.`);
    }

    addAgrAdmin(userId);
    message.reply(`✅ Successfully added <@${userId}> to AGR Admin list.`);
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser("user");

    if (isAgrAdmin(user.id)) {
      return interaction.reply({
        content: `⚠️ ${user.tag} is already an AGR Admin.`,
        ephemeral: true,
      });
    }

    addAgrAdmin(user.id);
    return interaction.reply(
      `✅ Successfully added ${user.tag} to AGR Admin list.`,
    );
  },
};
