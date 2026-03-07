const { Events, ChannelType, EmbedBuilder } = require("discord.js");
const config = require("../config/env");
const client = require("../client/client");
const { hasPermission } = require("../utils/permissions");
const { getCommandRequiredPerms } = require("../utils/commandPermsManager");
const { getDenialMessage } = require("../utils/roasts");
const { isAllowed, getTargetChannelId } = require("../utils/dmChatManager");
const { isBlacklisted } = require("../utils/blacklistManager");
const { addMessageLink, getOriginalUser } = require("../utils/replyManager");
const { encodeUserInfo } = require("../utils/idEncoder");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check Blacklist
    if (isBlacklisted(message.author.id)) return;

    // --- Message Reaction Event ---
    const TARGET_IDS = [
      "696331073562607676",
      "541763571357319168",
      "1082257882935984128",
    ];
    const CUSTOM_REACTIONS = [
      "1365391998999330836",
      "822803220975976449",
      "1125775607549149265",
      "1295868441609244732",
      "1165744293802156133",
    ];

    // Check if the content contains the ID directly (for role pings or plain text IDs)
    // This ensures we only react when explicitly tagged in content, not just replied to
    const contentHasId = TARGET_IDS.some((id) => message.content.includes(id));

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
            await message
              .react(emojiId)
              .catch((e) =>
                console.error(`Failed to react with ${emojiId}:`, e.message),
              );
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

          const targetChannel = await client.channels
            .fetch(targetChannelId)
            .catch((err) => {
              console.error("Error fetching target channel:", err);
              return null;
            });
          if (targetChannel) {
            // Forward message directly (Anonymous Relay)
            try {
              const files = message.attachments.map((a) => a.url);
              const stickers = message.stickers.map((s) => s.url);

              let contentToSend = message.content || "";

              if (stickers.length > 0) {
                if (contentToSend.length > 0) contentToSend += "\n";
                contentToSend += stickers.join("\n");
              }

              if (contentToSend.length === 0 && files.length === 0) return;

              // Encode User ID invisibly
              const hiddenId = encodeUserInfo(message.author.id);

              // Append to content with a separator (newline) to avoid breaking links
              const finalContent =
                (contentToSend ? contentToSend + "\n" : "") + hiddenId;

              // Send as a plain message
              const sentMsg = await targetChannel.send({
                content: finalContent,
                files: files,
              });

              // Track message for replies
              addMessageLink(sentMsg.id, message.author.id);

              await message.react("✅"); // Confirm sent
            } catch (err) {
              console.error("Failed to forward DM message", err);
              await message.react("❌");
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

    // Get command from collection or aliases
    const command =
      client.commands.get(commandName) ||
      client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    // If command doesn't exist, return with feedback
    if (!command) {
      if (commandName.length > 0) {
        return message
          .reply(
            `❌ Unknown command: \`${commandName}\`. Type \`${config.prefix}help\` for a list of commands.`,
          )
          .catch(console.error);
      }
      return;
    }

    // Check permissions (default to 3 if not specified)
    const requiredPerms = getCommandRequiredPerms(
      commandName,
      command.perms || 3,
    );
    if (!hasPermission(message.author.id, requiredPerms)) {
      return message
        .reply(getDenialMessage(message.author.id))
        .catch(console.error);
    }

    // Execute command
    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      message
        .reply("❌ There was an error executing that command!")
        .catch(console.error);
    }
  },
};
