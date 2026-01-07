const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'jv',
  description: 'Post the verification message',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('jv')
    .setDescription('Post the verification message'),

  async execute(message, args) {
    if (message.deletable) await message.delete().catch(() => {});
    await this.handleJv(message.channel);
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: 'Ephemeral' });
    await this.handleJv(interaction.channel);
    await interaction.editReply('✅ Verification message posted.');
  },

  async handleJv(channel) {
    const msgContent = 
      "# 🔒 **Server Verification Required**\n\n" +
      "## To access the full server, you need to verify yourself!\n\n" +
      "## 🎧 **Join the verification voice channel** and wait patiently.\n" +
      "## 🔍 A staff member will verify you shortly.\n" +
      "## ⚠️ Make sure your microphone is working and you're ready to speak if asked.\n\n" +
      "## ❤️ Verification helps keep our community safe.\n" +
      "https://discord.com/channels/392360591114633217/913899047989936138";

    await channel.send(msgContent);
  }
};
