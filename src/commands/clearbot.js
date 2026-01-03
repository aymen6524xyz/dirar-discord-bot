const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Message command properties
  name: 'clearbot',
  description: 'Deletes bot messages from the channel',
  
  // Permission level required (5 = master, 8 = owner)
  perms: 5,
  
  // Enable/disable command
  enabled: true,
  
  // Slash command data
  data: new SlashCommandBuilder()
    .setName('clearbot')
    .setDescription('Deletes bot messages from the channel')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to scan and delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),
  
  // Message command handler
  async execute(message, args) {
    // Check if user has permission to manage messages
    if (!message.member.permissions.has('ManageMessages')) {
      return message.reply('❌ You need the "Manage Messages" permission to use this command!');
    }

    // Get the number of messages to delete
    const amount = parseInt(args[0]);
    
    if (!amount || isNaN(amount) || amount < 1 || amount > 100) {
      return message.reply('❌ Please provide a valid number between 1 and 100!');
    }

    try {
      // Fetch messages from the channel
      const messages = await message.channel.messages.fetch({ limit: amount });
      
      // Filter for bot messages
      const botMessages = messages.filter(msg => msg.author.bot);
      
      if (botMessages.size === 0) {
        return message.reply('❌ No bot messages found in the last ' + amount + ' messages!');
      }

      // Delete the bot messages
      const deleted = await message.channel.bulkDelete(botMessages, true);
      
      // Send confirmation (will be deleted after 5 seconds)
      const reply = await message.reply(`✅ Deleted ${deleted.size} bot message(s)!`);
      
      // Delete the confirmation message after 5 seconds
      setTimeout(() => {
        reply.delete().catch(() => {});
      }, 5000);
      
    } catch (error) {
      console.error('Error deleting bot messages:', error);
      
      // Handle specific Discord errors
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
    // Check if user has permission to manage messages
    if (!interaction.member.permissions.has('ManageMessages')) {
      return interaction.reply({
        content: '❌ You need the "Manage Messages" permission to use this command!',
        ephemeral: true,
      });
    }

    const amount = interaction.options.getInteger('amount');

    try {
      // Defer reply since this might take a moment
      await interaction.deferReply({ ephemeral: true });

      // Fetch messages from the channel
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      
      // Filter for bot messages
      const botMessages = messages.filter(msg => msg.author.bot);
      
      if (botMessages.size === 0) {
        return interaction.editReply('❌ No bot messages found in the last ' + amount + ' messages!');
      }

      // Delete the bot messages
      const deleted = await interaction.channel.bulkDelete(botMessages, true);
      
      // Send confirmation
      await interaction.editReply(`✅ Deleted ${deleted.size} bot message(s)!`);
      
    } catch (error) {
      console.error('Error deleting bot messages:', error);
      
      // Handle specific Discord errors
      if (error.code === 50034) {
        return interaction.editReply('❌ Cannot delete messages older than 14 days!');
      } else if (error.code === 50013) {
        return interaction.editReply('❌ I don\'t have permission to delete messages in this channel!');
      }
      
      return interaction.editReply('❌ An error occurred while deleting messages!');
    }
  },
};

