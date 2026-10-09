const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
    getOriginalUser,
    getLastActiveUser,
    getLastMessageId,
    getLatestMessageIdForUser
} = require('../utils/replyManager');
const { getTargetChannelId } = require('../utils/dmChatManager');
const { decodeUserInfo } = require('../utils/idEncoder');

module.exports = {
    name: 'reply',
    description: 'Reply in the target channel to a forwarded DM.',
    perms: 8, // Master only
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply in the target channel to a forwarded DM')
        .addStringOption(option => 
            option.setName('target')
                .setDescription('Message ID, "last", or Username')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('content')
                .setDescription('The message to send')
                .setRequired(true))
        .addAttachmentOption(option =>
            option.setName('attachment')
                .setDescription('Attach a file')),

    async execute(message, args) {
        if (args.length < 2) {
            return message.reply('❗ Usage: `!reply <MessageID | last | username> <Content>`');
        }

        const target = args[0];
        const content = args.slice(1).join(' ');
        
        await this.handleReply(message, target, content, false);
    },

    async executeSlash(interaction) {
        const target = interaction.options.getString('target');
        const content = interaction.options.getString('content');
        const attachment = interaction.options.getAttachment('attachment');

        await interaction.deferReply({ ephemeral: true });
        await this.handleReply(interaction, target, content, true, attachment);
    },

    async handleReply(ctx, targetInput, content, isSlash = false, attachment = null) {
        const client = ctx.client;
        let originalUserId = null;
        let replyToMessageId = null; // ID of the message in Staff Channel to reply to

        // 1. Check for "last" keyword
        if (targetInput.toLowerCase() === 'last') {
            originalUserId = getLastActiveUser();
            replyToMessageId = getLastMessageId();
            if (!originalUserId) {
                const msg = `❌ No recent DMs found to reply to.`;
                return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
            }
        } 
        // 2. Check if input is a Message ID/Link
        else {
            // Check for Discord Message Link (Public or Private Channels)
            // Format: https://discord.com/channels/GuildID/ChannelID/MessageID
            const linkMatch = targetInput.match(/channels\/\d{17,19}\/(\d{17,19})\/(\d{17,19})/);
            
            if (linkMatch) {
                // It's a valid Discord Message Link!
                const channelId = linkMatch[1];
                const messageId = linkMatch[2];
                // Check if the link is from the configured staff channel
                const staffChannelId = getTargetChannelId();
                if (staffChannelId && channelId === staffChannelId) {
                    replyToMessageId = messageId;
                }

                try {
                    const channel = await client.channels.fetch(channelId).catch(() => null);
                    if (channel) {
                        const msg = await channel.messages.fetch(messageId).catch(() => null);
                        if (msg) {
                            // If it's a message link, we want to reply to the AUTHOR of that message
                            originalUserId = msg.author.id;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch message from link:", e);
                }
                
                if (!originalUserId) {
                    const msg = `❌ Could not resolve message from link. I might not have access to that channel.`;
                    return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
                }
            } 
            else {
                // Not a link, try standard ID/Username lookup
                const match = targetInput.match(/(\d{17,19})$/);
                const potentialId = match ? match[1] : targetInput;

                originalUserId = getOriginalUser(potentialId);

                // If found in DB, it implies potentialId IS a message ID from the staff channel
                if (originalUserId) {
                    replyToMessageId = potentialId;
                }

                // 3. If not found in DB, try fetching message from Staff Channel (Legacy Support)
                if (!originalUserId && /^\d{17,19}$/.test(potentialId)) {
                try {
                    const targetChannelId = getTargetChannelId();
                    if (targetChannelId) {
                        const channel = await client.channels.fetch(targetChannelId).catch(() => null);
                        if (channel) {
                            const msg = await channel.messages.fetch(potentialId).catch(() => null);
                            if (msg) {
                                // We found a message with this ID in the staff channel
                                replyToMessageId = potentialId;

                                // Attempt 1: Check for invisible encoded ID
                                const decodedId = decodeUserInfo(msg.content);
                                if (decodedId) {
                                    originalUserId = decodedId;
                                } 
                                // Attempt 2: Check for legacy Embed Footer
                                else if (msg.embeds.length > 0 && msg.embeds[0].footer && msg.embeds[0].footer.text.includes('User ID: ')) {
                                    originalUserId = msg.embeds[0].footer.text.split('User ID: ')[1].trim();
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore fetch errors
                }
            }

            // 4. If still not found, try other methods
            if (!originalUserId) {
                if (/^\d{17,19}$/.test(potentialId)) {
                    // Check if this ID is actually a message in the staff channel
                    try {
                        const targetChannelId = getTargetChannelId();
                        if (targetChannelId) {
                            const channel = await client.channels.fetch(targetChannelId).catch(() => null);
                            if (channel) {
                                const msg = await channel.messages.fetch(potentialId).catch(() => null);
                                if (msg) {
                                    // It IS a message, but we failed to resolve user data
                                    const errMsg = `❌ Found that message, but I don't know who sent it (The link data is missing or expired).`;
                                    return isSlash ? ctx.editReply(errMsg) : ctx.reply(errMsg);
                                }
                            }
                        }
                    } catch (e) {}

                    // Assume it's a User ID
                    originalUserId = potentialId;
                } else {
                    // 4. Try Username Search
                    const user = client.users.cache.find(u => 
                        u.username.toLowerCase().includes(targetInput.toLowerCase()) || 
                        u.tag.toLowerCase().includes(targetInput.toLowerCase())
                    );
                    
                    if (user) {
                        originalUserId = user.id;
                        replyToMessageId = getLatestMessageIdForUser(user.id);
                    } else {
                        const msg = `❌ Could not find user/message for \`${targetInput}\`. Try using 'last' or a valid ID.`;
                        return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
                    }
                }
            }
        }
    }

        try {
            const targetChannelId = getTargetChannelId();
            if (!targetChannelId) {
                const errMsg = `❌ No target channel is configured.`;
                return isSlash ? ctx.editReply(errMsg) : ctx.reply(errMsg);
            }

            const targetChannel = await client.channels.fetch(targetChannelId);
            if (!targetChannel || !targetChannel.isTextBased()) {
                throw new Error("Configured target channel is not text-based or could not be found.");
            }

            const payload = { content: content, files: [] };

            if (attachment) {
                payload.files.push(attachment);
            }
            
            if (!isSlash && ctx.attachments && ctx.attachments.size > 0) {
                 ctx.attachments.forEach(att => payload.files.push(att));
            }

            if (replyToMessageId) {
                payload.reply = {
                    messageReference: replyToMessageId,
                    failIfNotExists: false
                };
            }

            await targetChannel.send(payload);

            const successMsg = `✅ Reply sent in the target channel.`;
            return isSlash ? ctx.editReply(successMsg) : ctx.reply(successMsg);

        } catch (error) {
            console.error("Reply Error:", error);

            const errMsg = `❌ Failed to send: ${error.message}`;
            return isSlash ? ctx.editReply(errMsg) : ctx.reply(errMsg);
        }
    }
}
