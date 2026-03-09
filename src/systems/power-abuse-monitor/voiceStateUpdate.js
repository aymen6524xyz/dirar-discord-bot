const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const configEnv = require("../../config/env"); // Import env config for ownerIds

// Simple in-memory tracker for potential abuse
// structure: Map<executorId, Array<{timestamp, type, victimId}>>
const abuseTracker = new Map();
const ABUSE_THRESHOLD_COUNT = 4; // Number of actions to trigger warning
const ABUSE_TIME_WINDOW = 5 * 60 * 1000; // 5 minutes

module.exports = {
  name: Events.VoiceStateUpdate,
  execute: async (oldState, newState) => {
    // Reload configuration every execution
    let config = {};
    try {
      const configPath = path.join(__dirname, "config.json");
      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, "utf8");
        config = JSON.parse(configFile);
      }
    } catch (e) {
      console.error("[PowerAbuseMonitor] Failed to load config:", e);
      return;
    }

    if (!config.monitorChannelId) return;

    const guild = newState.guild;
    const me = guild.members.me;

    // Check if bot has view audit logs permission
    if (!me.permissions.has("ViewAuditLog")) {
      return;
    }

    // Get the User ID involved from either old or new state
    const userId =
      (newState.member ? newState.member.id : newState.id) ||
      (oldState.member ? oldState.member.id : oldState.id);
    if (!userId) return; // Should not happen

    let changeType = null;
    let auditLogType = null;
    let expectedChangeKey = null; // 'mute' or 'deaf' for MemberUpdate
    let expectedNewValue = null; // true or false

    // 1. Server Mute ON
    if (!oldState.serverMute && newState.serverMute) {
      changeType = "Server Mute (Enabled)";
      auditLogType = AuditLogEvent.MemberUpdate;
      expectedChangeKey = "mute";
      expectedNewValue = true;
    }
    // 2. Server Mute OFF
    else if (oldState.serverMute && !newState.serverMute) {
      changeType = "Server Mute (Disabled)";
      auditLogType = AuditLogEvent.MemberUpdate;
      expectedChangeKey = "mute";
      expectedNewValue = false;
    }
    // 3. Server Deafen ON
    else if (!oldState.serverDeaf && newState.serverDeaf) {
      changeType = "Server Deafen (Enabled)";
      auditLogType = AuditLogEvent.MemberUpdate;
      expectedChangeKey = "deaf";
      expectedNewValue = true;
    }
    // 4. Server Deafen OFF
    else if (oldState.serverDeaf && !newState.serverDeaf) {
      changeType = "Server Deafen (Disabled)";
      auditLogType = AuditLogEvent.MemberUpdate;
      expectedChangeKey = "deaf";
      expectedNewValue = false;
    }

    if (!changeType) return;

    // Check for ignored channels
    const IGNORED_CHANNELS = [
      "1395169083393179720",
      "978701419660075138",
      "978701551046656030",
      "978701634366500964",
    ];

    if (newState.channelId && IGNORED_CHANNELS.includes(newState.channelId)) {
      return;
    }

    // --- HELPER FUNCTION TO CHECK AUDIT LOGS ---
    const checkAuditLog = async (isRetry = false) => {
      try {
        const auditLogs = await guild.fetchAuditLogs({
          limit: 20, // Check last 20 entries
          type: auditLogType,
        });

        // Current time for debug/age check
        const now = Date.now();

        // Allow a wider window for the retry (up to 30s)
        const maxAge = isRetry ? 30000 : 10000;

        // Find the audit log entry
        const entry = auditLogs.entries.find((e) => {
          // Must have a target
          if (!e.target) return false;
          // Target ID match?
          if (e.target.id !== userId) return false;

          // For mute/deaf, usually MemberUpdate
          const age = now - e.createdTimestamp;
          if (age > maxAge) return false;

          if (
            auditLogType === AuditLogEvent.MemberUpdate &&
            e.action !== AuditLogEvent.MemberUpdate
          )
            return false;

          return true;
        });

        if (entry) {
          // Verify changes if needed
          if (auditLogType === AuditLogEvent.MemberUpdate) {
            const change = entry.changes.find(
              (c) => c.key === expectedChangeKey,
            );
            if (!change) return false; // Not the right change
            await sendLog(entry);
            return true;
          }
        }

        return false;
      } catch (error) {
        console.error("[PowerAbuseMonitor] Error checking logs:", error);
        return false; // Error counts as not found
      }
    };

    // --- HELPER TO SEND LOG & CHECK ABUSE ---
    const sendLog = async (entry) => {
      const executor = entry.executor;

      // Safety check: if executor is the user themselves, ignore.
      if (executor.id === userId) return;

      // Get victim details safely. Member might be null if left guild.
      let victimUser = null;
      if (newState.member) victimUser = newState.member.user;
      else if (oldState.member) victimUser = oldState.member.user;

      // If victim is still null, try fetching or just use ID
      if (!victimUser) {
        try {
          victimUser = await guild.client.users.fetch(userId);
        } catch (e) {}
      }

      const victimTag = victimUser ? victimUser.tag : "Unknown User";
      const victimId = userId;
      const victimAvatar = victimUser ? victimUser.displayAvatarURL() : null;

      // Fetch channel object for logging
      const monitorChannel = guild.channels.cache.get(config.monitorChannelId);

      // --- 1. SEND BASIC LOG ---
      if (monitorChannel && monitorChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(`🚨 Power Abuse Monitor: ${changeType}`)
          .setColor(changeType.includes("Disabled") ? "Green" : "Red")
          .addFields(
            {
              name: "🛡️ Executor",
              value: `${executor ? executor.tag : "Unknown"} (\`${executor ? executor.id : "?"}\`)`,
              inline: true,
            },
            {
              name: "👤 Victim",
              value: `${victimTag} (\`${victimId}\`)`,
              inline: true,
            },
            {
              name: "📅 Time",
              value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
              inline: true,
            },
          );

        if (victimAvatar) embed.setThumbnail(victimAvatar);

        embed.addFields({
          name: "🔊 Current Channel",
          value: `<#${newState.channelId}>`,
          inline: false,
        });

        if (entry.reason) {
          embed.addFields({ name: "📝 Reason", value: entry.reason });
        }

        embed.setFooter({ text: `Action Logged by Monitor System` });
        embed.setTimestamp();

        monitorChannel.send({ embeds: [embed] });
      }

      // --- 2. CHECK FOR ABUSE PATTERNS ---
      if (executor) {
        const now = Date.now();
        let actions = abuseTracker.get(executor.id) || [];

        // Filter out old actions (> 5 mins)
        actions = actions.filter((a) => now - a.timestamp < ABUSE_TIME_WINDOW);

        // Add current action
        actions.push({
          timestamp: now,
          type: changeType,
          victimId: victimId,
        });

        // Allow actions to stick for further processing
        abuseTracker.set(executor.id, actions);

        // Trigger criteria:
        // 1. Total actions > threshold (e.g., 4 in 5 mins)

        if (actions.length >= ABUSE_THRESHOLD_COUNT) {
          const distinctVictims = new Set(actions.map((a) => a.victimId)).size;

          const alertEmbed = new EmbedBuilder()
            .setTitle("⚠️ POTENTIAL POWER ABUSE DETECTED")
            .setColor("DarkRed")
            .setDescription(
              `**Executor:** <@${executor.id}> (\`${executor.tag}\`)\n**Recent Actions:** ${actions.length} in last 5 minutes\n**Unique Victims:** ${distinctVictims}`,
            )
            .addFields({
              name: "Last Action",
              value: `${changeType} on <@${victimId}>`,
            })
            .setTimestamp();

          // Tag owners
          const ownerTags = configEnv.ownerIds
            .map((id) => `<@${id}>`)
            .join(" ");

          if (monitorChannel && monitorChannel.isTextBased()) {
            monitorChannel.send({
              content: `🚨 **ADMIN ALERT** ${ownerTags}`,
              embeds: [alertEmbed],
            });

            // Reset tracker to avoid spamming the same alert instantly?
            // Or just clear it so next alert requires another 4 violations
            abuseTracker.delete(executor.id);
          }
        }
      }
    };

    // --- EXECUTION FLOW ---

    // Check helper
    const tryCheck = async (isRetry) => {
      try {
        return await checkAuditLog(isRetry);
      } catch (e) {
        console.error("Error in check attempt", e);
        return false;
      }
    };

    // 1. First check: Fast (2 seconds delay to allow API propagation)
    setTimeout(async () => {
      const found = await tryCheck(false);

      if (!found) {
        // 2. Second check: Delayed (15 seconds total delay) to catch laggy logs
        setTimeout(async () => {
          await tryCheck(true);
        }, 13000);
      }
    }, 2000);
  },
};
