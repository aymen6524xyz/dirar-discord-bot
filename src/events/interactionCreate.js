const { Events } = require('discord.js');
const client = require('../client/client');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.slashCommands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      // Check permissions (default to 3 if not specified)
      const requiredPerms = command.perms || 3;
      if (!hasPermission(interaction.user.id, requiredPerms)) {
        return interaction.reply({
          content: '❌ You don\'t have permission to use this command!',
          ephemeral: true,
        });
      }

      try {
        // Try executeSlash first, fall back to execute if it doesn't exist
        if (command.executeSlash) {
          await command.executeSlash(interaction);
        } else if (command.execute) {
          await command.execute(interaction);
        } else {
          throw new Error('Command has no execute method');
        }
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = {
          content: '❌ There was an error executing this command!',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }
  },
};

