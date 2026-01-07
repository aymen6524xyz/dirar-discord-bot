const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'logwarn',
  description: 'Log a warned member',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('logwarn')
    .setDescription('Log a warned member')
    .addUserOption(option => 
      option.setName('member')
        .setDescription('The warned member')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the warning')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length < 2) {
        const errorMsg = await message.reply('❗ Usage: `d?logwarn <member_id/mention> <reason>`');
        setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
        return;
    }
    
    if (message.deletable) await message.delete().catch(() => {});

    // Try to get member from mentions first
    let member = message.mentions.members.first();
    let memberId = args[0].replace(/[<@!>]/g, '');

    // If no mention, try to fetch by ID from args[0]
    if (!member) {
      try {
        member = await message.guild.members.fetch(memberId);
      } catch (e) {
        // Not in guild, try fetching as user
        try {
          const user = await message.client.users.fetch(memberId);
          member = { user: user, id: user.id, displayName: user.username };
        } catch (e2) {
          return message.channel.send(`⚠️ Member with ID \`${memberId}\` not found.`);
        }
      }
    }

    const reason = args.slice(1).join(' ');
    await this.handleLogWarn(message, member, reason, message.author);
  },

  async executeSlash(interaction) {
    const member = interaction.options.getMember('member') || interaction.options.getUser('member');
    const reason = interaction.options.getString('reason');

    await interaction.deferReply({ flags: 'Ephemeral' }); 
    
    // Normalize member object if it's a User (happens if user left guild)
    const target = member.user ? member : { user: member, id: member.id, displayName: member.username };

    await this.handleLogWarn(interaction, target, reason, interaction.user, true);
  },

  async handleLogWarn(ctx, member, reason, adminUser, isSlash = false) {
    // member object should have .user inside it if it's a guild member, or resemble one
    const userObj = member.user || member;

    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

    const logEmbed = new EmbedBuilder()
      .setDescription(
        `⚠️ **Warning Issued**\n` +
        `👤 **Member:** ${userObj.username} (${member.id})\n` +
        `📄 **Reason:** ${reason}\n` +
        `🔧 **Warned by:** ${adminUser.username} (${adminUser.id})\n` +
        `📅 **Date:** ${timestamp}\n` +
        `📂 **Proofs (if any) should be found below**\n` +
        `━━━━━━━━━━━━━━━━━━`
      )
      .setColor(0xFFA500); // Orange color

    if (isSlash) {
      await ctx.channel.send({ embeds: [logEmbed] });
      await ctx.editReply('✅ Warning log created.');
    } else {
      await ctx.channel.send({ embeds: [logEmbed] });
    }
  }
};
