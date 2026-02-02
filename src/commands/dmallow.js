const { SlashCommandBuilder } = require("discord.js");
const { addAllowedUser, isVip } = require("../utils/dmChatManager");

module.exports = {
  name: "dmallow",
  description: "Allow a user to chat via Bot DMs",
  perms: 8, // VIP check overrides this in code
  data: new SlashCommandBuilder()
    .setName("dmallow")
    .setDescription("Allow a user to chat via Bot DMs")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to allow")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Duration (e.g., 5m, 1h). Leave empty for permanent.")
        .setRequired(false),
    ),

  async execute(message, args) {
    if (!isVip(message.author.id)) {
      return message.reply(
        "⛔ You are not authorized to manage DM Chat permissions.",
      );
    }

    const userId = args[0]?.replace(/[<@!>]/g, "");
    const timeStr = args[1]?.toLowerCase(); // Support 5M, 5m

    if (!userId)
      return message.reply(
        "❗ Usage: `d?dmallow <user> [time]`\nExample: `d?dmallow @User 5m`",
      );

    // Parse time
    let duration = null;
    let timeLabel = "permanently";

    if (timeStr) {
      const match = timeStr.match(/^(\d+)([smhd])$/);
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2];

        if (unit === "s") duration = val * 1000;
        else if (unit === "m") duration = val * 60 * 1000;
        else if (unit === "h") duration = val * 3600 * 1000;
        else if (unit === "d") duration = val * 86400 * 1000;

        timeLabel = `for ${timeStr}`;
      } else {
        return message.reply(
          "❌ Invalid time format. Use `5m`, `1h`, `1d` etc.",
        );
      }
    }

    try {
      const user = await message.client.users.fetch(userId);
      addAllowedUser(user.id, duration);
      message.reply(
        `✅ **${user.tag}** is now allowed to use the DM Chat ${timeLabel}.`,
      );
    } catch (e) {
      console.log(e);
      message.reply("❌ Invalid user or ID.");
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
    const timeStr = interaction.options.getString("time");

    let duration = null;
    let timeLabel = "permanently";

    if (timeStr) {
      const match = timeStr.match(/^(\d+)([smhd])$/i); // Case insensitive match
      if (match) {
        const val = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        if (unit === "s") duration = val * 1000;
        else if (unit === "m") duration = val * 60 * 1000;
        else if (unit === "h") duration = val * 3600 * 1000;
        else if (unit === "d") duration = val * 86400 * 1000;

        timeLabel = `for ${timeStr}`;
      } else {
        return interaction.reply({
          content: "❌ Invalid time format. Use `5m`, `1h`, `1d` etc.",
          ephemeral: true,
        });
      }
    }

    addAllowedUser(user.id, duration);
    interaction.reply(
      `✅ **${user.tag}** is now allowed to use the DM Chat ${timeLabel}.`,
    );
  },
};
