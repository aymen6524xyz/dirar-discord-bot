const { Events, ChannelType, EmbedBuilder } = require('discord.js');
const config = require('../config/env');
const client = require('../client/client');
const { hasPermission } = require('../utils/permissions');
const { getDenialMessage } = require('../utils/roasts');
const { isAllowed, getTargetChannelId } = require('../utils/dmChatManager');
const { isBlacklisted } = require('../utils/blacklistManager');

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check Blacklist
    if (isBlacklisted(message.author.id)) return;

    // --- Message Reaction Event ---
    const TARGET_IDS = ['696331073562607676', '541763571357319168', '1082257882935984128'];
    const CUSTOM_REACTIONS = [
        '1365391998999330836',
        '822803220975976449',
        '1125775607549149265',
        '1295868441609244732',
        '1165744293802156133'
    ];

    // Check if the content contains the ID directly (for role pings or plain text IDs)
    // This ensures we only react when explicitly tagged in content, not just replied to
    const contentHasId = TARGET_IDS.some(id => message.content.includes(id));

    if (contentHasId) {
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
            // Forward message with Embed for clean reply support
            try {
                const files = message.attachments.map(a => a.url);
                const stickers = message.stickers.map(s => s.url);
                
                if (message.content.length === 0 && files.length === 0 && stickers.length === 0) return; 

                const embed = new EmbedBuilder()
                    .setAuthor({ name: `${message.author.tag} (${message.author.id})`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
                    .setDescription(message.content || '')
                    .setFooter({ text: `User ID: ${message.author.id}` })
                    .setTimestamp()
                    .setColor('Blue');

                // Handle Reply Context (User replying to a bot message in DM)
                if (message.reference && message.reference.messageId) {
                    try {
                        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
                        if (repliedMsg) {
                            let replyPreview = repliedMsg.content || repliedMsg.embeds?.[0]?.description || '[Attachment/Sticker]';
                            if (replyPreview.length > 50) replyPreview = replyPreview.substring(0, 47) + '...';
                            embed.addFields({ name: 'Replying to:', value: replyPreview, inline: false });
                        }
                    } catch (e) {
                        // ignore reply fetch error
                    }
                }

                // If only one image, set it as embed image for better look
                if (files.length === 1 && (files[0].endsWith('.png') || files[0].endsWith('.jpg') || files[0].endsWith('.jpeg') || files[0].endsWith('.gif'))) {
                    embed.setImage(files[0]);
                }

                // Construct payload
                const payload = { embeds: [embed], files: files };
                
                // Add stickers info to content or description if description is empty
                if (stickers.length > 0) {
                     // Since we can't attach stickers as stickers in a bot message easily without nitro/pack logic, we send links
                     const stickerText = `\n**Stickers sent:**\n${stickers.join('\n')}`;
                     embed.setDescription((embed.data.description || '') + stickerText);
                }
                
                // Handling Pings: content outside embed
                // If the user's message contains <@&...> (Roles) or <@...> (Users), we want them to actually ping in the staff channel?
                // Probably yes, if they are asking for help.
                // However, users can't mention Roles in DMs to resolve to IDs usually.
                // But if they copy-paste an ID <@&999>, it might work.
                
                await targetChannel.send(payload);
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

    // --- Admin Reply Handler (ModMail style) ---
    // Allows admins to reply to forwarded DMs by replying to the bot's message in the target channel
    const targetChannelId = getTargetChannelId();
    if (message.channel.id === targetChannelId && message.reference && !message.author.bot) {
        try {
            const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
            
            // Check if the referenced message is from the bot and has the expected embed
            if (referencedMsg.author.id === client.user.id && referencedMsg.embeds.length > 0) {
                const footerText = referencedMsg.embeds[0].footer?.text;
                if (footerText && footerText.startsWith('User ID: ')) {
                    const originalUserId = footerText.split('User ID: ')[1];
                    const originalUser = await client.users.fetch(originalUserId).catch(() => null);

                    if (originalUser) {
                        const files = message.attachments.map(a => a); // Pass attachment objects
                        const stickers = message.stickers.map(s => s.url);
                        
                        let contentToSend = `**[Response from ${message.author.username}]**\n${message.content}`;
                        if (stickers.length > 0) {
                            contentToSend += `\n${stickers.join('\n')}`;
                        }

                        const payload = { 
                            content: contentToSend,
                            files: files
                        };

                        await originalUser.send(payload);
                        await message.react('📨'); // Confirm reply sent
                        return; // Stop processing command parsing for replies
                    }
                }
            }
        } catch (err) {
            console.error("Error handling admin reply:", err);
            await message.react('❌');
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

