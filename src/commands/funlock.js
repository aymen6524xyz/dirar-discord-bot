const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'funlock',
  description: 'Unlock a voice channel',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('funlock')
    .setDescription('Unlock a voice channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The voice channel to unlock')
        .setRequired(true)),

  async execute(message, args) {
    // Check if ID is provided, ONLY if it looks like an ID (digits), otherwise ignore args[0]
    let channelId = null;
    if (args[0] && /^\d+$/.test(args[0])) {
        channelId = args[0];
    } else if (message.member.voice.channelId) {
        channelId = message.member.voice.channelId;
    }

    if (!channelId) return message.reply('❗ Please provide a channel ID or be in a voice channel.');

    const channel = message.guild.channels.cache.get(channelId);
    await this.handleUnlock(message, channel);
  },

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    await interaction.deferReply();
    await this.handleUnlock(interaction, channel, true);
  },

  async handleUnlock(ctx, channel, isSlash = false) {
     if (!channel || !channel.isVoiceBased()) {
       const msg = '❌ Invalid channel. Please provide a valid Voice Channel.';
       return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
     }

     try {
       // Reset for everyone (or set to true if you want to force open)
       // usually unlock means setting Connect: null (neutral/inherit)
       await channel.permissionOverwrites.edit(ctx.guild.id, { Connect: null }); 

       const msg = `🔓 **Unlocked** <#${channel.id}>. Permissions reset for @everyone.`;
       return isSlash ? ctx.editReply(msg) : ctx.reply(msg);

     } catch (error) {
       console.error(error);
       const errorMsg = `❌ Failed to unlock channel: ${error.message}`;
       return isSlash ? ctx.editReply(errorMsg) : ctx.reply(errorMsg);
     }
  }
};
