const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Message command properties
  name: 'ping',
  description: 'Replies with Pong!',
  
  // Permission level required (3 = everyone, 5 = master, 8 = owner only)
  perms: 3,
  
  // Enable/disable command (defaults to true if not specified)
  enabled: true,
  
  // Slash command data (optional - only include if you want a slash command)
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  // Message command handler
  execute(message, args) {
    message.reply('🏓 Pong!');
  },
  
  // Slash command handler (optional - only include if you have 'data' property)
  async executeSlash(interaction) {
    await interaction.reply('🏓 Pong!');
  },
};
