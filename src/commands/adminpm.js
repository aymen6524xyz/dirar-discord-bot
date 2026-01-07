const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'adminpm',
  description: 'Send a private message to a user',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('adminpm')
    .setDescription('Send a private message to a user')
    .addStringOption(option => 
      option.setName('user_id')
        .setDescription('The ID of the user')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length < 2) return message.reply('❗ Usage: `d?adminpm <user_id> <message>`');
    
    const userId = args[0];
    const userMsg = args.slice(1).join(' ');

    await this.handleAdminPm(message, userId, userMsg);
  },

  async executeSlash(interaction) {
    const userId = interaction.options.getString('user_id');
    const userMsg = interaction.options.getString('message');

    await interaction.deferReply();
    await this.handleAdminPm(interaction, userId, userMsg, true);
  },

  async handleAdminPm(ctx, userId, userMsg, isSlash = false) {
    const client = ctx.client;
    
    try {
      // Fetch user
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) {
        const msg = `❌ User with ID ${userId} not found.`;
        return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
      }

      // Send DM
      const dmMessage = `This is a **AGR-ADMIN-PM** : **${userMsg}**`;
      await user.send(dmMessage);

      const successMsg = `✅ Message successfully sent to **${user.tag}**.`;
      return isSlash ? ctx.editReply(successMsg) : ctx.reply(successMsg);

    } catch (error) {
      console.error(error);
      let errorResponse = `❌ Failed to send message.`;
      
      if (error.code === 50007) {
        errorResponse = `⚠️ Could not send the message. The user might have DMs disabled.`;
      } else {
        errorResponse = `❌ An unexpected error occurred: ${error.message}`;
      }

      return isSlash ? ctx.editReply(errorResponse) : ctx.reply(errorResponse);
    }
  }
};
