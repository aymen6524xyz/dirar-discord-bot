const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'log',
  description: 'Log a banned user',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Log a banned user')
    .addStringOption(option => 
      option.setName('member_id')
        .setDescription('The ID of the banned member')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the ban')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length < 2) {
        const errorMsg = await message.reply('❗ Usage: `d?log <member_id> <reason>`');
        setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
        return;
    }
    
    // Delete command message if possible
    if (message.deletable) await message.delete().catch(() => {});

    // Clean ID from mention if present
    const memberId = args[0].replace(/[<@!>]/g, '');
    const reason = args.slice(1).join(' ');

    await this.handleLog(message, memberId, reason, message.author);
  },

  async executeSlash(interaction) {
    const memberId = interaction.options.getString('member_id');
    const reason = interaction.options.getString('reason');

    await interaction.deferReply({ ephemeral: true }); // Confirmation message is hidden
    await this.handleLog(interaction, memberId, reason, interaction.user, true);
  },

  async handleLog(ctx, memberId, reason, adminUser, isSlash = false) {
    const client = ctx.client;

    try {
      // Fetch user (works even if banned)
      const user = await client.users.fetch(memberId).catch(() => null);
      if (!user) {
        const msg = `⚠️ User not found. Check the ID and try again.`;
        return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
      }

      const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

      const logEmbed = new EmbedBuilder()
        .setDescription(
          `🚫 **Banned User:** ${user.username} (${user.id})\n` +
          `📄 **Reason:** ${reason}\n` +
          `🔨 **Banned by:** ${adminUser.username} (${adminUser.id})\n` +
          `📅 **Date:** ${timestamp}\n` +
          `📂 **Proofs (if any) should be found below**\n` +
          `━━━━━━━━━━━━━━━━━━`
        )
        .setColor(0xFF0000); // Red color

      if (isSlash) {
        // For slash command, we send the log to the channel
        await ctx.channel.send({ embeds: [logEmbed] });
        await ctx.editReply('✅ Log entry created.');
      } else {
        await ctx.channel.send({ embeds: [logEmbed] });
      }

    } catch (error) {
      console.error(error);
      const errMsg = `❌ Error occurred: ${error.message}`;
      if (isSlash) ctx.editReply(errMsg);
      else ctx.channel.send(errMsg);
    }
  }
};
