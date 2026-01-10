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

    // --- Message Reaction Event ---
    const TARGET_IDS = ['696331073562607676', '541763571357319168'];
    const CUSTOM_REACTIONS = [
        '1365391998999330836',
        '822803220975976449',
        '1125775607549149265',
        '1295868441609244732',
        '1165744293802156133'
    ];

    const hasMention = message.mentions.users.some(user => TARGET_IDS.includes(user.id)) || 
                       message.mentions.roles.some(role => TARGET_IDS.includes(role.id)) ||
                       (message.reference && (await message.fetchReference().catch(() => null))?.author && TARGET_IDS.includes((await message.fetchReference()).author.id)); // Basic reply check

    // Check if the message mentions the target users directly
    // Also checking if the AUTHOR is one of the target IDs (responding to them) or if they are mentioned
    const mentionsTarget = message.mentions.users.some(u => TARGET_IDS.includes(u.id));
    
    // Also check if the content contains the ID directly (for role pings or plain text IDs)
    const contentHasId = TARGET_IDS.some(id => message.content.includes(id));

    if (mentionsTarget || contentHasId) {
        // React with random reactions from the list
        // Since these look like custom emoji IDs, we need to find them or just try to react
        // Note: Custom emojis need to be known by the bot (in its cache)
        
        // Pick one random reaction or all? "add an event to auto react"
        // I will pick 2 random ones to be fun but not spammy, or just iterate.
        // Let's try to react with up to 3 random ones.
        const shuffled = CUSTOM_REACTIONS.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        for (const emojiId of selected) {
             try {
                 // Try to find the emoji in the cache first to ensure it's valid
                 const emoji = message.client.emojis.cache.get(emojiId);
                 if (emoji) {
                     await message.react(emoji);
                 } else {
                     // If not found in cache, try reacting with the ID directly (sometimes works if bot is in the Guild)
                     await message.react(emojiId).catch(e => console.error(`Failed to react with ${emojiId}:`, e.message));
                 }
             } catch (e) {
                 console.error(`Error reacting with ${emojiId}:`, e);
             }
        }
    }

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

