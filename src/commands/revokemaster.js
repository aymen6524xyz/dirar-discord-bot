const { SlashCommandBuilder } = require('discord.js');
const { removeMaster, isMaster } = require('../utils/masterManager');
const config = require('../config/env');

module.exports = {
  name: 'revokemaster',
  description: 'Revoke Master permissions (Level 5) from a user.',
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName('revokemaster')
    .setDescription('Revoke Master permissions from a user')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('The user to demote')
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

    if (!isMaster(userId)) {
        return message.reply(`⚠️ <@${userId}> is not a Master.`);
    }

    const removed = removeMaster(userId);
    if (removed) {
        message.reply(`✅ Successfully revoked Master permissions from <@${userId}>.`);
    } else {
        // Check if in static config
        if (config.masterIds && config.masterIds.includes(userId)) {
            message.reply(`❌ Cannot revoke <@${userId}> via command because they are hardcoded in \`.env\`. Please edit the MASTER_IDS in the file.`);
        } else {
            message.reply(`❓ Something went wrong. User seemed to be a Master but could not be removed.`);
        }
    }
  },

  async executeSlash(interaction) {
    const user = interaction.options.getUser('user');
    
    if (!isMaster(user.id)) {
        return interaction.reply({ content: `⚠️ ${user.tag} is not a Master.`, ephemeral: true });
    }

    const removed = removeMaster(user.id);
    if (removed) {
        return interaction.reply(`✅ Successfully revoked Master permissions from ${user.tag}.`);
    } else {
         if (config.masterIds && config.masterIds.includes(user.id)) {
            return interaction.reply({ content: `❌ Cannot revoke ${user.tag} via command because they are hardcoded in \`.env\`. Please edit the MASTER_IDS in the file.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `❓ Something went wrong.`, ephemeral: true });
        }
    }
  }
};
