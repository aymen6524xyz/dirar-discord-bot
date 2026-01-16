const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'adminpm',
  description: 'Send a private message to a user',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('adminpm')
    .setDescription('Send a private message to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to DM')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(false))
    .addAttachmentOption(option =>
      option.setName('attachment')
        .setDescription('Attach an image or file')
        .setRequired(false)),

  async execute(message, args) {
    if (args.length < 1 && message.attachments.size === 0 && message.stickers.size === 0) {
        return message.reply('❗ Usage: `d?adminpm <@user/id> [message]` (you can also attach files/stickers)');
    }
    
    // Handle Mentions or IDs
    let userId = args[0];
    if (message.mentions.users.size > 0) {
        userId = message.mentions.users.first().id;
        // If the first arg was the mention, remove it from content args if needed
        // But usually current args parser might split it. 
        // We'll assume args[0] is the user ref.
    } else if (userId) {
        // Clean ID just in case
        userId = userId.replace(/[<@!>]/g, '');
    }

    // Capture message content (everything after the first arg if it was a user ref)
    // If just attachment sent, args might be empty or valid 
    let userMsg = args.length > 1 ? args.slice(1).join(' ') : (args.length === 1 && args[0].includes(userId) ? '' : args.join(' ')); 

    // If the first arg was considered the ID, the msg is the rest.
    // However, if the user does `d?adminpm text`, we have a problem: we need a target.
    // The command requires a target.
    
    // Safety check for ID
    if (!userId || !/^\d+$/.test(userId)) {
        return message.reply('❗ Please provide a valid User ID or Mention.');
    }

    await this.handleAdminPm(message, userId, userMsg, false);
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const userMsg = interaction.options.getString('message') || '';
    const attachment = interaction.options.getAttachment('attachment');

    await interaction.deferReply({ ephemeral: true });
    await this.handleAdminPm(interaction, user.id, userMsg, true, attachment);
  },

  async handleAdminPm(ctx, userId, userMsg, isSlash = false, attachment = null) {
    const client = ctx.client;
    
    try {
      // Fetch user
      const user = await client.users.fetch(userId).catch(() => null);
      if (!user) {
        const msg = `❌ User with ID ${userId} not found.`;
        return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
      }

      const payload = { content: userMsg || undefined }; 
      const files = [];

      // Handle Slash Attachment
      if (attachment) {
          files.push(attachment);
      }

      // Handle Message Context Attachments (Text Command)
      if (!isSlash && ctx.attachments && ctx.attachments.size > 0) {
          ctx.attachments.forEach(att => files.push(att));
      }

       // Handle Message Stickers (Text Command) - Best effort (send URL)
      if (!isSlash && ctx.stickers && ctx.stickers.size > 0) {
         ctx.stickers.forEach(sticker => {
             // Append sticker URL to content or as file if possibly
             if (!payload.content) payload.content = '';
             payload.content += `\n${sticker.url}`;
         });
      }

      if (files.length > 0) {
          payload.files = files;
      }

      if (!payload.content && (!payload.files || payload.files.length === 0)) {
           const msg = `❌ Cannot send an empty message.`;
           return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
      }

      // Sending raw message so it looks like it comes from the bot directly
      // (Header removed to maintain anonymity)

      // Send DM
      await user.send(payload);

      const successMsg = `✅ Message sent to **${user.tag}**.`;
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
