const { Events, ChannelType } = require('discord.js');
const config = require('../config/env');
const client = require('../client/client');
const { hasPermission } = require('../utils/permissions');
const { getDenialMessage } = require('../utils/roasts');
const { isAllowed, getTargetChannelId } = require('../utils/dmChatManager');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Handle DM Chat Forwarding
    if (message.channel.type === ChannelType.DM) {
      // Check if user is allowed to chat via DM
      if (isAllowed(message.author.id)) {
        // If message starts with command prefix, let it fall through to command handler
        // But if it's just text, forward it
        if (!message.content.startsWith(config.prefix)) {
          const targetChannelId = getTargetChannelId();
          if (!targetChannelId) return; // No channel configured

          const targetChannel = await client.channels.fetch(targetChannelId).catch(err => {
              console.error("Error fetching target channel:", err);
              return null;
          });
          if (targetChannel) {
            // Forward message
            // Create a webhook-like appearance or just send as bot saying "User: message"
            try {
                // Handle attachments
                const files = message.attachments.map(a => a.url);
                if (message.content.length === 0 && files.length === 0) return; // Ignore empty messages (stickers etc) without content
                await targetChannel.send({
                    content: message.content,
                    files: files
                });
                await message.react('✅'); // Confirm sent
            } catch (err) {
                console.error("Failed to forward DM message", err);
                await message.react('❌');
            }
          } else {
             console.log("Target channel not found for DM forwarding.");
             // Optional: tell user forwarding is down
          }
          return;
        }
      } else {
        // User not allowed, roast them if it's not a command attempt
        if (!message.content.startsWith(config.prefix)) {
            message.reply(getDenialMessage(message.author.id));
            return;
        }
      }
    }

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
      return message.reply(getDenialMessage(message.author.id)).catch(console.error);
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

