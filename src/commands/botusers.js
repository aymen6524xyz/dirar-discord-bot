const { EmbedBuilder } = require("discord.js");
const config = require("../config/env");
const { getAgrAdmins } = require("../utils/agrAdminManager");
const { getAllMasters } = require("../utils/masterManager");

module.exports = {
  name: "botusers",
  description: "Shows different categories of bot users (Owners, Admins, Masters)",
  perms: 8,
  async execute(message, args) {
    const owners = config.ownerIds || [];
    const admins = getAgrAdmins() || [];
    const masters = getAllMasters() || [];

    const formatUsers = (users) => {
        if (!users || users.length === 0) return "None";
        return users.map(id => `<@${id}>`).join(", ");
    };

    const embed = new EmbedBuilder()
      .setTitle("Bot Users")
      .setColor("#2b2d31")
      .addFields(
        { name: `👑 Owners [${owners.length}]`, value: formatUsers(owners) },
        { name: `🛡️ Admins [${admins.length}]`, value: formatUsers(admins) },
        { name: `🗡️ Masters [${masters.length}]`, value: formatUsers(masters) }
      )
      .setTimestamp()
      .setFooter({ text: "Bot User Categories" });

    return message.reply({ embeds: [embed] });
  },
};
