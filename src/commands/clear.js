const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
  // Message command properties
  name: 'clear',
  description: 'Deletes messages from the channel',
  
  // Permission level required (5 = master, 8 = owner)
  perms: 5,
  
  // Enable/disable command
  enabled: true,
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes messages from the channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  
  // Message command handler
  async execute(message, args) {
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ You need the "Manage Messages" permission to use this command!');
    }

    const amount = parseInt(args[0]);
    
    if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Please provide a valid number between 1 and 100!');
    }

    try {
      // Fetch messages from the channel
      const messages = await message.channel.messages.fetch({ limit: amount });
      
      if (messages.size === 0) {
        return message.reply(`❌ No messages found.`);
      }

      // Delete the messages
      const deleted = await message.channel.bulkDelete(messages, true);
      
      let replyContent = `✅ Deleted ${deleted.size} message(s)!`;
      if (deleted.size === 0 && messages.size > 0) {
        replyContent = '⚠️ Found messages, but they are **older than 14 days** and cannot be bulk deleted due to Discord API limits.';
      }
      
      const reply = await message.reply(replyContent);
      
      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 5000);
      
    } catch (error) {
      console.error('Error deleting messages:', error);
      
      if (error.code === 50034) {
        return message.reply('❌ Cannot delete messages older than 14 days!');
      } else if (error.code === 50013) {
        return message.reply('❌ I don\'t have permission to delete messages in this channel!');
      }
      
      return message.reply('❌ An error occurred while deleting messages!');
    }
  },
  
  // Slash command handler
  async executeSlash(interaction) {
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({
        content: '❌ You need the "Manage Messages" permission to use this command!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const amount = interaction.options.getInteger('amount');

    try {
      await interaction.deferReply({ ephemeral: true });

      const messages = await interaction.channel.messages.fetch({ limit: amount });
      
      if (messages.size === 0) {
        return interaction.editReply(`❌ No messages found.`);
      }

      const deleted = await interaction.channel.bulkDelete(messages, true);
      
      if (deleted.size === 0 && messages.size > 0) {
        await interaction.editReply('⚠️ Found messages, but they are **older than 14 days** and cannot be bulk deleted due to Discord API limits.');
      } else {
        await interaction.editReply(`✅ Deleted ${deleted.size} message(s)!`);
      }
      
    } catch (error) {
      console.error('Error deleting messages:', error);
      
      if (error.code === 40060) return;

      if (error.code === 50034) {
        if (interaction.deferred || interaction.replied) await interaction.editReply('❌ Cannot delete messages older than 14 days!');
        return;
      } else if (error.code === 50013) {
        if (interaction.deferred || interaction.replied) await interaction.editReply('❌ I don\'t have permission to delete messages in this channel!');
        return;
      }
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ An error occurred while deleting messages!');
      }
    }
  },
};
