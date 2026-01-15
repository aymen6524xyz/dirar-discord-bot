const { Events, MessageFlags } = require('discord.js');
const client = require('../client/client');
const { hasPermission } = require('../utils/permissions');
const { getDenialMessage } = require('../utils/roasts');
const { isBlacklisted } = require('../utils/blacklistManager');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Check Blacklist for all interactions
    if (isBlacklisted(interaction.user.id)) {
        if (interaction.isRepliable()) {
            await interaction.reply({ content: '🚫 You are blacklisted from using this bot.', flags: MessageFlags.Ephemeral });
        }
        return;
    }

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
          content: getDenialMessage(interaction.user.id),
          flags: MessageFlags.Ephemeral,
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
          flags: MessageFlags.Ephemeral,
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

