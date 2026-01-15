const { SlashCommandBuilder } = require('discord.js');
const { blacklistUser, isBlacklisted } = require('../utils/blacklistManager');

module.exports = {
  name: 'blacklist',
  description: 'Block a user from using the bot completely',
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Block a user from using the bot')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to block')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('Reason for blocking')
        .setRequired(false)),

  async execute(message, args) {
    let userId = args[0];
    if (message.mentions.users.size > 0) {
      userId = message.mentions.users.first().id;
    } else if (userId) {
      userId = userId.replace(/[<@!>]/g, '');
    }

    if (!userId || !/^\d+$/.test(userId)) {
      return message.reply('❗ Please provide a valid User ID or Mention.');
    }
    
    // Prevent blocking self or other owners (simple safety)
    if (userId === message.author.id) {
        return message.reply("❌ You cannot blacklist yourself.");
    }

    if (isBlacklisted(userId)) {
        return message.reply(`⚠️ <@${userId}> is already blacklisted.`);
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    blacklistUser(userId, reason);
    message.reply(`🚫 <@${userId}> has been blacklisted from using the bot.\nReason: **${reason}**`);
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (user.id === interaction.user.id) {
        return interaction.reply({ content: "❌ You cannot blacklist yourself.", ephemeral: true });
    }
    
    if (isBlacklisted(user.id)) {
        return interaction.reply({ content: `⚠️ ${user.tag} is already blacklisted.`, ephemeral: true });
    }

    blacklistUser(user.id, reason);
    return interaction.reply(`🚫 ${user.tag} has been blacklisted from using the bot.\nReason: **${reason}**`);
  }
};
