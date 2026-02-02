const { SlashCommandBuilder } = require("discord.js");
const config = require("../config/env");
const { isMaster } = require("../utils/masterManager");

const PINKIE_ID = "312729837506789377";
const SAFWAN_ID = "181607813666177024";

module.exports = {
  name: "status",
  description: "Check the status of a member (Warlord, Master, etc.)",
  perms: 3, // Everyone can use it
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Check the status of a member")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to check status for")
        .setRequired(false),
    ),

  async execute(message, args) {
    let targetId;
    let targetMember;

    // Try to get ID from args
    if (args[0]) {
      if (message.mentions.users.size > 0) {
        targetId = message.mentions.users.first().id;
      } else {
        targetId = args[0].replace(/[<@!>]/g, "");
      }
    } else {
      targetId = message.author.id;
    }

    try {
      // Try to resolve member object if possible, for mentions
      targetMember = await message.guild.members
        .fetch(targetId)
        .catch(() => null);
    } catch (e) {
      targetMember = null;
    }

    // Logic to determine status
    let response = "";

    // 1. Bot Owner (Warlord)
    if (config.ownerIds.includes(targetId)) {
      const mention = targetMember ? targetMember.toString() : `<@${targetId}>`;
      return message.reply(
        `👑 ${mention} is the **Warlord** - The supreme ruler of the Bot!`,
      );
    }

    // 2. Pinkie
    if (targetId === PINKIE_ID) {
      return message.reply(
        `👑 **Pinkie** is the **Sovereign Queen** - Ruling over this server!`,
      );
    }

    // 3. Safwan (Host)
    if (targetId === SAFWAN_ID) {
      // "say something good about him bec he's the one hosting the bot"
      return message.reply(
        `🛠️ **Safwan** is the **Server Ruler** - And the one keeping this bot alive and running! Respect!`,
      );
    }

    // 4. Master
    if (isMaster(targetId)) {
      return message.reply("🛡️ This user is a **Master**.");
    }

    // 5. Normal Member
    // "if member say is a normal ameber"
    return message.reply("👤 This user is a normal member.");
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser("user") || interaction.user;
    const targetId = user.id;

    // 1. Bot Owner (Warlord)
    if (config.ownerIds.includes(targetId)) {
      return interaction.reply(
        `👑 ${user.toString()} is the **Warlord** - The supreme ruler of the Bot!`,
      );
    }

    // 2. Pinkie
    if (targetId === PINKIE_ID) {
      return interaction.reply(
        `👑 **Pinkie** is the **Sovereign Queen** - Ruling over this server!`,
      );
    }

    // 3. Safwan (Host)
    if (targetId === SAFWAN_ID) {
      return interaction.reply(
        `🛠️ **Safwan** is the **Server Ruler** - And the one keeping this bot alive and running! Respect!`,
      );
    }

    // 4. Master
    if (isMaster(targetId)) {
      return interaction.reply("🛡️ This user is a **Master**.");
    }

    // 5. Normal Member
    return interaction.reply("👤 This user is a normal member.");
  },
};
