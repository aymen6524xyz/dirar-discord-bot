const { Events } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Load config
const configPath = path.join(__dirname, "config.json");
let systemConfig = {};

try {
  if (fs.existsSync(configPath)) {
    systemConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    console.warn("⚠️ Verification Listener system config missing!");
  }
} catch (error) {
  console.error("❌ Failed to load Verification Listener config:", error);
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    // Check if config is valid
    if (!systemConfig.unverifiedRoleId || !systemConfig.pingRoleId) {
      return;
    }

    // Only trigger when user joins a voice channel (newState.channelId) and wasn't in one or switched (oldState.channelId !== newState.channelId)
    if (!newState.channelId || oldState.channelId === newState.channelId)
      return;

    // Check if the joined channel is in the monitored list
    if (
      systemConfig.monitoredVoiceChannels &&
      systemConfig.monitoredVoiceChannels.length > 0
    ) {
      if (!systemConfig.monitoredVoiceChannels.includes(newState.channelId)) {
        return;
      }
    }

    const member = newState.member;

    // Check if member exists and has the unverified role
    if (!member || !member.roles.cache.has(systemConfig.unverifiedRoleId))
      return;

    try {
      const channel = newState.channel;
      if (!channel) {
        console.warn(
          `⚠️ Could not fetch voice channel to send verification alert!`,
        );
        return;
      }

      // Send the ping message
      const alertMsg = await channel.send({
        content: `<@&${systemConfig.pingRoleId}> A user with the Unverified role has joined a voice channel! Please verify them as soon as possible!`,
      });

      // Delete the alert after 10 minutes (600,000 ms)
      setTimeout(
        () => {
          alertMsg.delete().catch(() => {});
        },
        10 * 60 * 1000,
      );

      console.log(
        `✅ Verification alert sent for ${member.user.tag} in ${channel.name}`,
      );
    } catch (error) {
      console.error("❌ Error in Verification Listener system:", error);
    }
  },
};
