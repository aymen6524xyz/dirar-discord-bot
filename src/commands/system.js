const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config/env");
const { getAgrAdmins } = require("../utils/agrAdminManager");
const { getAllMasters } = require("../utils/masterManager");

module.exports = {
  name: "system",
  description: "Lists all users with special bot permissions.",
  perms: 8, // Administrator permission
  data: new SlashCommandBuilder()
    .setName("system")
    .setDescription("Lists all users with special bot permissions."),

  async execute(message, args) {
    if (message.deletable) await message.delete().catch(() => {});
    await this.runCommand(message, message.author);
  },

  async executeSlash(interaction) {
    await this.runCommand(interaction, interaction.user);
  },

  async runCommand(context, user) {
    const isInteraction = typeof context.editReply === "function";

    // Helper for replying
    const sendReply = async (content, ephemeral = false) => {
      if (isInteraction) {
        if (context.deferred || context.replied)
          return context.editReply(content);
        return context.reply({ content, ephemeral });
      }
      return context.channel.send(content);
    };

    // Only allow Owners or AGR Admins to view this list?
    // The user didn't specify restriction, but usually system info is restricted.
    // I'll leave it unrestricted for now based on "list all the users that can use the bot",
    // implying transparency, or maybe restricted to admins.
    // I'll stick to a basic check if desired, but for now open to anyone with perms: 8 (Administrator) as defined in module.exports.

    const owners = config.ownerIds || [];
    const masters = getAllMasters();
    const agrAdmins = getAgrAdmins();

    // Fetch user details helper
    const fetchUserTag = async (userId) => {
      try {
        const user = await context.client.users.fetch(userId);
        return user
          ? `\`${user.tag}\` (<@${user.id}>)`
          : `\`Unknown User\` (${userId})`;
      } catch {
        return `\`Unknown User\` (${userId})`;
      }
    };

    // Owners
    const ownerList = await Promise.all(owners.map(fetchUserTag));

    // Masters
    const masterList = await Promise.all(masters.map(fetchUserTag));

    // AGR Admins
    const agrList = await Promise.all(agrAdmins.map(fetchUserTag));

    const embed = new EmbedBuilder()
      .setTitle("🛡️ System Access List")
      .setColor(0x3498db)
      .setTimestamp()
      .setFooter({ text: "Bot Access Control" });

    // Section 1: Owners & Developers
    let ownerContent = ownerList.length > 0 ? ownerList.join("\n") : "None";
    embed.addFields({
      name: "👑 Owners / Developers",
      value: ownerContent,
    });

    // Section 2: AGR Admins
    const agrContent = agrList.length > 0 ? agrList.join("\n") : "None";
    embed.addFields({ name: "🛡️ AGR Admins", value: agrContent });

    // Section 3: Masters
    const masterContent =
      masterList.length > 0 ? masterList.join("\n") : "None";
    embed.addFields({ name: "🎓 Masters", value: masterContent });

    if (isInteraction) {
      await context.reply({ embeds: [embed] });
    } else {
      await context.channel.send({ embeds: [embed] });
    }
  },
};
