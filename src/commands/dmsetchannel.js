const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { setTargetChannel, isVip } = require('../utils/dmChatManager');

module.exports = {
  name: 'dmsetchannel',
  description: 'Set the channel where DMs will be forwarded',
  perms: 8,
  data: new SlashCommandBuilder()
    .setName('dmsetchannel')
    .setDescription('Set the channel where DMs will be forwarded')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The target channel')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)),

  async execute(message, args) {
    if (!isVip(message.author.id)) {
        return message.reply("⛔ You are not authorized to manage DM Chat permissions.");
    }

    let channelId = args[0]?.replace(/[<#>]/g, '');
    if (!channelId) channelId = message.channel.id; // Default to current if not provided? Or enforce arg? Current is fine.

    const channel = message.guild.channels.cache.get(channelId);
    if (!channel || !channel.isTextBased()) {
        return message.reply("❌ Invalid text channel.");
    }

    setTargetChannel(channel.id);
    message.reply(`✅ DM forwarding channel set to <#${channel.id}>.`);
  },

  async executeSlash(interaction) {
    if (!isVip(interaction.user.id)) {
        return interaction.reply({ content: "⛔ You are not authorized to manage DM Chat permissions.", ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel');
    setTargetChannel(channel.id);
    interaction.reply(`✅ DM forwarding channel set to <#${channel.id}>.`);
  }
};
