const { SlashCommandBuilder } = require('discord.js');
const roastsManager = require('../utils/roasts');

module.exports = {
  name: 'roastme',
  description: 'Roast a user with Algerian flavor 🇩🇿',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('roastme')
    .setDescription('Roast a user with Algerian flavor 🇩🇿')
    .addUserOption(option => 
        option.setName('target')
        .setDescription('The user to roast')
        .setRequired(false)),

  async execute(message, args) {
     const target = message.mentions.users.first() || message.author;
     
     // Reload if empty
     if (!roastsManager.roasts || roastsManager.roasts.length === 0) {
         roastsManager.reloadRoasts();
     }

     const roastOrCompliment = roastsManager.getDenialMessage(target.id);

     if (!roastOrCompliment) {
         return message.channel.send(`${target}, I got nothing to say to you.`);
     }

     await message.channel.send(`${target}, ${roastOrCompliment}`);
  },

  async executeSlash(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;
    
    // Reload if empty
    if (!roastsManager.roasts || roastsManager.roasts.length === 0) {
        roastsManager.reloadRoasts();
    }

    const roastOrCompliment = roastsManager.getDenialMessage(target.id);

    if (!roastOrCompliment) {
        return interaction.reply(`${target}, I got nothing to say to you.`);
    }

    await interaction.reply(`${target}, ${roastOrCompliment}`);
  }
};
