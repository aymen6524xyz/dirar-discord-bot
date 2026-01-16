const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getOriginalUser, getLastActiveUser } = require('../utils/replyManager');
const { getTargetChannelId } = require('../utils/dmChatManager');
const { decodeUserInfo } = require('../utils/idEncoder');

module.exports = {
    name: 'reply',
    description: 'Reply to a forwarded DM. Use "last" to reply to the most recent DM.',
    perms: 5, // Master only
    data: new SlashCommandBuilder()
        .setName('reply')
        .setDescription('Reply to a forwarded DM')
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
            if (!originalUserId) {
                const msg = `❌ No recent DMs found to reply to.`;
                return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
            }
            // We don't have a message ID for "last" easily available to reply to
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
                    } else {
                        const msg = `❌ Could not find user/message for \`${targetInput}\`. Try using 'last' or a valid ID.`;
                        return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
                    }
                }
            }
        }
    }

        try {
            // Fetch User
            const user = await client.users.fetch(originalUserId);
            if (!user) throw new Error("User not found via API.");

            const payload = { content: content, files: [] };

            if (attachment) {
                payload.files.push(attachment);
            }
            
            if (!isSlash && ctx.attachments && ctx.attachments.size > 0) {
                 ctx.attachments.forEach(att => payload.files.push(att));
            }

            await user.send(payload);

            // Log to Staff Channel
            try {
                const targetChannelId = getTargetChannelId();
                if (targetChannelId) {
                    const targetChannel = await client.channels.fetch(targetChannelId).catch(() => null);
                    if (targetChannel) {
                        let logContent = `${content || '[File Sent]'}`;
                        
                        if (replyToMessageId) {
                             await targetChannel.send({ content: logContent, reply: { messageReference: replyToMessageId, failIfNotExists: false } });
                        } else {
                             await targetChannel.send({ content: logContent });
                        }
                    }
                }
            } catch (logErr) {
                console.error("Failed to log reply:", logErr);
            }

            const successMsg = `✅ **Anonymous** reply sent to **${user.tag}**!`;
            return isSlash ? ctx.editReply(successMsg) : ctx.reply(successMsg);

        } catch (error) {
            console.error("Reply Error:", error);

            if (error.code === 50007) {
                const errMsg = `❌ **Cannot send DM to this user.**\nThey have likely disabled DMs from server members, blocked the bot, or are no longer in the server.`;
                return isSlash ? ctx.editReply(errMsg) : ctx.reply(errMsg);
            }

            const errMsg = `❌ Failed to send: ${error.message}`;
            return isSlash ? ctx.editReply(errMsg) : ctx.reply(errMsg);
        }
    }
}

