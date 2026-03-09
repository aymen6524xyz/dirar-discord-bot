const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config/env");
const { isAgrAdmin } = require("../utils/agrAdminManager");

const PINKIE_ID = "312729837506789377";
const VERIFICATION_CHANNEL_ID = "800640245992652840";

module.exports = {
  name: "verificationtop",
  description:
    "Counts how many members each admin verified in the last 7 days.",
  perms: 8, // Permissions handled internally
  data: new SlashCommandBuilder()
    .setName("verificationtop")
    .setDescription(
      "Counts how many members each admin verified in the last 7 days.",
    ),

  async execute(message, args) {
    await this.runCommand(message, message.author);
  },

  async executeSlash(interaction) {
    await this.runCommand(interaction, interaction.user);
  },

  async runCommand(context, user) {
    const isInteraction = typeof context.editReply === "function";

    // Permission Check: Owner or Pinkie only
    const isOwner = config.ownerIds.includes(user.id);
    const isPinkie = user.id === PINKIE_ID;

    // Helper for replying
    const sendReply = async (content, ephemeral = false) => {
      if (isInteraction) {
        if (context.deferred || context.replied)
          return context.editReply(content);
        return context.reply({ content, ephemeral });
      }
      return context.channel.send(content);
    };

    if (!isOwner && !isPinkie && !isAgrAdmin) {
      return sendReply(
        "⛔ You do not have permission to use this command.",
        true,
      );
    }

    // Initial loading message
    let replyMsg;
    if (isInteraction) {
      replyMsg = await context.reply({
        content: "⏳ Scanning messages from the last 7 days...",
        fetchReply: true,
      });
    } else {
      replyMsg = await context.channel.send(
        "⏳ Scanning messages from the last 7 days...",
      );
    }

    const channel =
      context.guild.channels.cache.get(VERIFICATION_CHANNEL_ID) ||
      (await context.guild.channels
        .fetch(VERIFICATION_CHANNEL_ID)
        .catch(() => null));

    if (!channel) {
      const errorMsg = `❌ Channel with ID \`${VERIFICATION_CHANNEL_ID}\` not found.`;
      return isInteraction
        ? context.editReply(errorMsg)
        : replyMsg.edit(errorMsg);
    }

    // === USER PROVIDED LOGIC ===

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Matches:
    // !ss 123456789
    // !ss <@123456789>
    // !ss 123456789 (optional note)
    const verifyPattern = /^!ss\s+(<@!?(\d+)>|\d+)/i;

    const counter = new Map();

    let lastMessageId = null;
    let fetching = true;

    try {
      while (fetching) {
        const messages = await channel.messages.fetch({
          limit: 100,
          before: lastMessageId,
        });

        if (messages.size === 0) break;

        for (const msg of messages.values()) {
          if (msg.createdTimestamp < weekAgo) {
            fetching = false;
            break;
          }

          if (msg.author.bot) continue;

          if (verifyPattern.test(msg.content.trim())) {
            const count = counter.get(msg.author.id) || 0;
            counter.set(msg.author.id, count + 1);
          }
        }

        lastMessageId = messages.last().id;
      }

      if (counter.size === 0) {
        const msg = "No verification messages found in the last week.";
        return isInteraction
          ? context.editReply(msg)
          : context.channel.send(msg);
      }

      // Sort leaderboard
      const sorted = [...counter.entries()].sort((a, b) => b[1] - a[1]);

      const leaderboard = (
        await Promise.all(
          sorted.map(async ([userId, count], index) => {
            let user = context.guild.members.cache.get(userId);
            if (!user) {
              user = await context.guild.members
                .fetch(userId)
                .catch(() => null);
            }
            const name = user ? user.displayName : `User ${userId}`;
            return `**${index + 1}.** ${name} — \`${count}\` verifications`;
          }),
        )
      ).join("\n");

      const embed = new EmbedBuilder()
        .setTitle("🏆 Weekly Verification Leaderboard")
        .setDescription(leaderboard)
        .setColor(0x2ecc71)
        .setTimestamp()
        .setFooter({ text: "Counted messages from the last 7 days" });

      if (isInteraction)
        await context.editReply({ content: null, embeds: [embed] });
      else await context.channel.send({ content: null, embeds: [embed] });
    } catch (e) {
      console.error(e);
      sendReply("❌ Error scanning messages.");
    }
  },
};
