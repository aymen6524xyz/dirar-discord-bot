const { Events } = require('discord.js');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    // Verification Notification Event
    const ROLE_ID = '1336786255857451072';
    const VERIFICATION_CHANNELS = ['913899047989936138', '1377448275078283304'];
    
    // MISSING: The prompt mentioned "a tag to the role with this id is ..... for later is done"
    // Assuming we need to tag a role in a text channel when the condition is met.
    // WARNING: Replace with actual ID
    // Since the prompt was incomplete, I am extracting the intent: "Notify when specific role joins specific channels"
    const NOTIFICATION_ROLE_TO_TAG = '1336786255857451072'; 
    // ^ The user said "tag to the role with this id is ..... for later is done"
    // This is confusing. It might mean "The ID to tag is [blank] for later".
    
    // Check if user joined a channel
    if (!oldState.channelId && newState.channelId) {
        // User joined
        if (VERIFICATION_CHANNELS.includes(newState.channelId)) {
            // Check if user has the specific role
            if (newState.member.roles.cache.has(ROLE_ID)) {
                // Find a channel to send the notification to.
                // Priority: 'verification-logs', 'staff-chat', 'general'
                // This logic is a guess because no output channel was specified.
                const logChannel = newState.guild.channels.cache.find(
                    c => (c.name.includes('staff') || c.name.includes('verify')) && c.isTextBased()
                );

                if (logChannel) {
                    await logChannel.send({
                        content: `🚨 <@&${NOTIFICATION_ROLE_TO_TAG}> A staff member <@${newState.member.id}> has entered a verification channel!`
                    });
                } else {
                    console.log(`User ${newState.member.id} with role ${ROLE_ID} entered ${newState.channelId}, but no log channel found.`);
                }
            }
        }
    }
  },
};
