const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  name: 'massgrant',
  description: 'Grant a role to multiple users',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('massgrant')
    .setDescription('Grant a role to multiple users')
    .addRoleOption(option => 
      option.setName('role')
        .setDescription('The role to grant')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('user_ids')
        .setDescription('User IDs separated by space')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length < 2) return message.reply('❗ Usage: `d?massgrant <role_id/mention> <user_ids...>`');
    
    // Parse role from first arg (ID or Mention)
    const roleId = args[0].replace(/[<@&>]/g, '');
    const role = message.guild.roles.cache.get(roleId);
    const userIds = args.slice(1);

    await this.handleMassGrant(message, role, userIds);
  },

  async executeSlash(interaction) {
    const role = interaction.options.getRole('role');
    const userIdsStr = interaction.options.getString('user_ids');
    const userIds = userIdsStr.split(/[\s,]+/).filter(id => id.length > 0);

    await interaction.deferReply();
    await this.handleMassGrant(interaction, role, userIds, true);
  },

  async handleMassGrant(ctx, role, userIds, isSlash = false) {
    if (!role) {
      const msg = '❌ Role not found.';
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }

    let successCount = 0;
    let failedCount = 0;
    const failedIds = [];

    const statusMsg = await (isSlash ? ctx.editReply('⏳ Processing mass grant...') : ctx.reply('⏳ Processing mass grant...'));

    for (const userId of userIds) {
      // Clean ID
      const cleanId = userId.replace(/[<@!>]/g, '');
      if (!/^\d+$/.test(cleanId)) continue; // Skip non-digit IDs

      try {
        const member = await ctx.guild.members.fetch(cleanId).catch(() => null);
        if (member) {
          await member.roles.add(role);
          successCount++;
        } else {
            failedCount++;
            failedIds.push(cleanId);
        }
      } catch (e) {
        console.error(`Failed to add role to ${cleanId}: ${e.message}`);
        failedCount++;
        failedIds.push(cleanId);
      }
    }

    const resultMsg = `✅ **Mass Grant Complete**\n` +
                      `🔰 **Role:** ${role.name}\n` +
                      `👥 **Granted:** ${successCount} users\n` +
                      `⚠️ **Failed:** ${failedCount} users`; // ${failedIds.length > 0 ? `(${failedIds.join(', ')})` : ''}

    if (isSlash) {
      await ctx.editReply(resultMsg);
    } else {
      if (statusMsg.editable) statusMsg.edit(resultMsg);
      else ctx.channel.send(resultMsg);
    }
  }
};
