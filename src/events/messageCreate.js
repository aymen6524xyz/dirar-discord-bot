const { Events } = require('discord.js');
const config = require('../config/env');
const client = require('../client/client');
const { hasPermission } = require('../utils/permissions');

module.exports = {
  name: Events.MessageCreate,
  execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if message starts with prefix
    if (!message.content.startsWith(config.prefix)) return;

    // Parse command and arguments
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Get command from collection
    const command = client.commands.get(commandName);

    // If command doesn't exist, return
    if (!command) return;

    // Check permissions (default to 3 if not specified)
    const requiredPerms = command.perms || 3;
    if (!hasPermission(message.author.id, requiredPerms)) {
      return message.reply('❌ You don\'t have permission to use this command!').catch(console.error);
    }

    // Execute command
    try {
      command.execute(message, args);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      message.reply('❌ There was an error executing that command!').catch(console.error);
    }
  },
};

