const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
const { waitingUsers } = require("./state");
const config = require("../../config/env");
const fs = require("fs");
const path = require("path");

// Load system config
const systemConfigPath = path.join(__dirname, "config.json");
let systemConfig = {};
try {
  if (fs.existsSync(systemConfigPath)) {
    systemConfig = JSON.parse(fs.readFileSync(systemConfigPath, "utf8"));
  }
} catch (e) {
  console.error("Failed to load Chris's Space config", e);
}

const createAndMove = async (member, guild) => {
  try {
    const channelName = "Chris's Space";

    // Create the channel
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: systemConfig.categoryId || member.voice.channel.parent, // Use config category or fallback to current parent
      permissionOverwrites: [
        {
          id: member.id,
          allow: [
            PermissionsBitField.Flags.ManageChannels,
            PermissionsBitField.Flags.Connect,
            PermissionsBitField.Flags.ViewChannel,
          ],
        },
        {
          id: guild.roles.everyone,
          allow: [],
        },
      ],
    });

    // Move user
    await member.voice.setChannel(channel);

    // Send Help Embed and Pin it
    try {
      const embed = new EmbedBuilder()
        .setTitle("Chris's Space Controls")
        .setDescription("Here are the commands to manage your temporary space:")
        .setColor("#2b2d31")
        .addFields(
          {
            name: "🔒 Lock",
            value: "`d?lock`\nPrevents anyone from joining.",
            inline: true,
          },
          {
            name: "🔓 Unlock",
            value: "`d?unlock`\nAllows everyone to join.",
            inline: true,
          },
          {
            name: "👤 Grant Access",
            value: "`d?grant @user`\nAllows a specific user to join.",
            inline: true,
          },
          {
            name: "🚫 Deny Access",
            value: "`d?deny @user`\nPrevents a specific user from joining.",
            inline: true,
          },
        )
        .setFooter({ text: "Chris's Space System" });

      const msg = await channel.send({ embeds: [embed] });
      // await msg.pin(); // Pinning removed as requested
    } catch (err) {
      console.error("Failed to send help message in Chris's Space:", err);
    }
  } catch (error) {
    console.error("Failed to create Chris's Space:", error);
  }
};

module.exports = {
  name: "myvent",
  description: "Creates Chris's Space",
  perms: 8,
  async execute(message, args) {
    // Check if user is owner
    if (!config.ownerIds.includes(message.author.id)) {
      return message.reply("❌ You are not authorized to use this command.");
    }

    const member = message.member;

    if (member.voice.channel) {
      // Delete user's command message
      message.delete().catch(() => {});

      await createAndMove(member, message.guild);

      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 5000);
    } else {
      waitingUsers.add(member.id);
      message.delete().catch(() => {});

      const reply = await message.channel.send(
        `${member.toString()} Please join a voice room sir so i can move you`,
      );
      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 5000);
    }
  },
  createAndMove, // Export it here
};
