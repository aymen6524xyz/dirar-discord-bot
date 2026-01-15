const { SlashCommandBuilder } = require('discord.js');
const { addMaster, isMaster } = require('../utils/masterManager');

module.exports = {
  name: 'addmaster',
  description: 'Grant Master permissions (Level 5) to a user.',
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName('addmaster')
    .setDescription('Grant Master permissions to a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to promote')
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

    if (isMaster(userId)) {
        return message.reply(`⚠️ <@${userId}> is already a Master.`);
    }

    addMaster(userId);
    message.reply(`✅ Successfully added <@${userId}> to Master list.`);
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    
    if (isMaster(user.id)) {
        return interaction.reply({ content: `⚠️ ${user.tag} is already a Master.`, ephemeral: true });
    }

    addMaster(user.id);
    return interaction.reply(`✅ Successfully added ${user.tag} to Master list.`);
  }
};
