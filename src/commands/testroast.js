const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'roastme',
  description: 'Try to use this command to test the roast system!',
  perms: 10, // Sets permission to 10 (Impossible, since Owner is 8)
  data: new SlashCommandBuilder()
    .setName('roastme')
    .setDescription('Try to use this command to test the roast system!'),

  async execute(message, args) {
    message.reply("🐛 Bug: You shouldn't be seeing this message. The roast failed.");
  },

  async executeSlash(interaction) {
    interaction.reply("🐛 Bug: You shouldn't be seeing this message. The roast failed.");
  }
};
