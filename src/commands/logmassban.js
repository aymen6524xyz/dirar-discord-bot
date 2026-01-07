const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'logmassban',
  description: 'Log multiple banned users',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('logmassban')
    .setDescription('Log multiple banned users')
    .addStringOption(option => 
      option.setName('user_ids')
        .setDescription('Space-separated user IDs')
        .setRequired(true))
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the bans')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length < 2) {
        const errorMsg = await message.reply('❗ Usage: `d?logmassban <id1> <id2> ... <reason>`');
        setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
        return;
    }

    if (message.deletable) await message.delete().catch(() => {});

    // Separate IDs from reason. Assuming IDs are at the start, reason is the rest.
    // Heuristic: IDs are usually numeric. 
    const userIds = [];
    let reasonStartIndex = 0;

    for (let i = 0; i < args.length; i++) {
        // Simple check if it looks like a snowflake ID (17-19 digits)
        if (/^\d{17,19}$/.test(args[i])) {
            userIds.push(args[i]);
        } else {
            reasonStartIndex = i;
            break;
        }
    }

    const reason = args.slice(reasonStartIndex).join(' ');

    if (userIds.length === 0) return message.reply('❌ No valid user IDs provided.');
    if (!reason) return message.reply('❌ Please provide a reason.');

    // Assuming there's a log channel, let's try to find it. 
    // In log.js (not shown fully) it likely sends to a specific channel. 
    // Since I don't have the log channel ID in context, I will search for a channel named 'logs' or 'mod-logs'
    const logChannel = message.guild.channels.cache.find(c => c.name.includes('log') && c.isTextBased());

    if (!logChannel) {
        return message.channel.send('⚠️ Could not find a log channel (e.g., #logs, #mod-logs).');
    }

    let count = 0;
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    
    for (const id of userIds) {
        // Try to fetch user to get name
        let userTag = 'Unknown User';
        try {
            const user = await message.client.users.fetch(id);
            userTag = user.tag;
        } catch (e) {
            // User might not exist or be fetchable
        }

        const embed = new EmbedBuilder()
          .setTitle('🔨 Ban Log')
          .setColor('#FF0000') // Red
          .addFields(
            { name: 'Moderator', value: `${message.author.tag} (${message.author.id})`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Banned User', value: `${userTag} (\`${id}\`)` },
            { name: '\u200B', value: `📅 **Date:** ${timestamp}\n📂 **Proofs (if any) should be found below**` }
          );

        await logChannel.send({ embeds: [embed] });
        count++;
    }

    // confirm to user
    const confirm = await message.channel.send(`✅ Logged ${count} bans separately.`);
    setTimeout(() => confirm.delete().catch(() => {}), 5000);
  },

  async executeSlash(interaction) {
    const idsString = interaction.options.getString('user_ids');
    const reason = interaction.options.getString('reason');

    const userIds = idsString.split(/[\s,]+/).filter(id => /^\d{17,19}$/.test(id));

    if (userIds.length === 0) {
        return interaction.reply({ content: '❌ No valid user IDs provided.', flags: 'Ephemeral' });
    }

    const logChannel = interaction.guild.channels.cache.find(c => c.name.includes('log') && c.isTextBased());

    if (!logChannel) {
        return interaction.reply({ content: '⚠️ Could not find a log channel (e.g., #logs, #mod-logs).', flags: 'Ephemeral' });
    }

    await interaction.reply({ content: `Logging ${userIds.length} bans...`, flags: 'Ephemeral' });

    let count = 0;
    const timestamp = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

    for (const id of userIds) {
        // Try to fetch user to get name
        let userTag = 'Unknown User';
        try {
            const user = await interaction.client.users.fetch(id);
            userTag = user.tag;
        } catch (e) {
            // User might not exist or be fetchable
        }

        const embed = new EmbedBuilder()
          .setTitle('🔨 Ban Log')
          .setColor('#FF0000')
          .addFields(
            { name: 'Moderator', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Banned User', value: `${userTag} (\`${id}\`)` },
            { name: '\u200B', value: `📅 **Date:** ${timestamp}\n📂 **Proofs (if any) should be found below**` }
          );

        await logChannel.send({ embeds: [embed] });
        count++;
    }

    await interaction.editReply({ content: `✅ Logged ${count} bans separately.` });
  }
};
