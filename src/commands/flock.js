const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  name: 'flock',
  description: 'Lock a voice channel (Restrict everyone, Allow Monarchs)',
  perms: 5,
  data: new SlashCommandBuilder()
    .setName('flock')
    .setDescription('Lock a voice channel')
    .addChannelOption(option => 
      option.setName('channel')
        .setDescription('The voice channel to lock')
        .setRequired(true)),

  async execute(message, args) {
    // Check if ID is provided, ONLY if it looks like an ID (digits), otherwise ignore args[0]
    let channelId = null;
    if (args[0] && /^\d+$/.test(args[0])) {
        channelId = args[0];
    } else if (message.member.voice.channelId) {
        channelId = message.member.voice.channelId;
    }

    if (!channelId) return message.reply('❗ Please provide a channel ID or be in a voice channel.');

    const channel = message.guild.channels.cache.get(channelId);
    await this.handleLock(message, channel);
  },

  async executeSlash(interaction) {
    const channel = interaction.options.getChannel('channel');
    await interaction.deferReply();
    await this.handleLock(interaction, channel, true);
  },

  async handleLock(ctx, channel, isSlash = false) {
     if (!channel || !channel.isVoiceBased()) {
       const msg = '❌ Invalid channel. Please provide a valid Voice Channel.';
       return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
     }

     let monarchsRole = ctx.guild.roles.cache.find(r => r.name.toLowerCase() === 'the monarchs') || 
                          ctx.guild.roles.cache.find(r => r.name.toLowerCase().includes('monarch')) ||
                          ctx.guild.roles.cache.find(r => r.name.toLowerCase().includes('king'));

     // If neither role found, ask user for it
     if (!monarchsRole) {
        const userId = isSlash ? ctx.user.id : ctx.author.id;
        const promptMsg = '⚠️ **Role "The Monarchs" (or similar) was not found.**\n**Please reply with the a valid Role Name or ID within 15 seconds to proceed.**';
        
        if (isSlash) await ctx.editReply(promptMsg);
        else await ctx.channel.send(promptMsg);

        try {
            const filter = m => m.author.id === userId;
            const collected = await ctx.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
            const reply = collected.first();
            const input = reply.content.trim();

            // Try to resolve role from input
            monarchsRole = ctx.guild.roles.cache.get(input.replace(/[<@&>]/g, '')) || 
                           ctx.guild.roles.cache.find(r => r.name.toLowerCase() === input.toLowerCase()) ||
                           ctx.guild.roles.cache.find(r => r.name.toLowerCase().includes(input.toLowerCase()));
            
            if (!monarchsRole) {
                const failMsg = `❌ Role **"${input}"** not found. Operation cancelled.`;
                if (isSlash) await ctx.followUp({ content: failMsg, ephemeral: true }); 
                else await ctx.channel.send(failMsg);
                return;
            }
            // Acknowledge found role
            const foundMsg = `✅ Found role: **${monarchsRole.name}**. Proceeding...`;
            if (isSlash) await ctx.followUp({ content: foundMsg, ephemeral: true });
            else await ctx.channel.send(foundMsg);

        } catch (e) {
            const timeOutMsg = '⏳ Time out! You didn\'t provide a role in time. Operation cancelled.';
            if (isSlash) await ctx.followUp({ content: timeOutMsg, ephemeral: true });
            else await ctx.channel.send(timeOutMsg);
            return;
        }
     }

     try {
       // Lock for everyone, Allow for Monarchs
       await channel.permissionOverwrites.edit(ctx.guild.id, { Connect: false }); // Deny @everyone
       await channel.permissionOverwrites.edit(monarchsRole.id, { Connect: true }); // Allow Monarchs

       const msg = `🔒 **Locked** <#${channel.id}> for everyone, allowed for **Monarchs**.`;
       return isSlash ? ctx.editReply(msg) : ctx.reply(msg);

     } catch (error) {
       console.error(error);
       const errorMsg = `❌ Failed to lock channel: ${error.message}`;
       return isSlash ? ctx.editReply(errorMsg) : ctx.reply(errorMsg);
     }
  }
};
