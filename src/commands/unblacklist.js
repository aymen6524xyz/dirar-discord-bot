const { SlashCommandBuilder } = require('discord.js');
const { unblacklistUser, isBlacklisted } = require('../utils/blacklistManager');

module.exports = {
  name: 'unblacklist',
  description: 'Unblock a user from using the bot',
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Unblock a user from using the bot')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to unblock')
        .setRequired(true)),

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

    if (!isBlacklisted(userId)) {
        return message.reply(`⚠️ <@${userId}> is not blacklisted.`);
    }

    unblacklistUser(userId);
    message.reply(`✅ <@${userId}> has been unblacklisted.`);
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    
    if (!isBlacklisted(user.id)) {
        return interaction.reply({ content: `⚠️ ${user.tag} is not blacklisted.`, ephemeral: true });
    }

    unblacklistUser(user.id);
    return interaction.reply(`✅ ${user.tag} has been unblacklisted.`);
  }
};
