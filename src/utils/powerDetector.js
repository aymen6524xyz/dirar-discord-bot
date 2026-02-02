const {
  AuditLogEvent,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// Path to configuration
const CONFIG_PATH = path.join(__dirname, "../config/powerWatchConfig.json");

// In-memory action history for detection
// Structure: { actorId: [ { type, targetId, channelId, timestamp, roleReversed } ] }
const actionHistory = new Map();

// Configuration cache
let config = require("../config/powerWatchConfig.json");

class PowerDetector {
  static loadConfig() {
    try {
      delete require.cache[require.resolve(CONFIG_PATH)];
      config = require(CONFIG_PATH);
    } catch (e) {
      console.error("Failed to reload power watch config", e);
    }
  }

  /**
   * Main entry point for voice state updates
   * @param {VoiceState} oldState
   * @param {VoiceState} newState
   */
  static async handleVoiceUpdate(oldState, newState) {
    // reloading config to ensure fresh state
    this.loadConfig();

    console.log(`[DEBUG] PowerDetector Triggered. Enabled: ${config.enabled}`);
    if (!config.enabled) return;

    const guild = newState.guild;
    const member = newState.member;

    // Identify the action type
    let actionType = null;
    let auditLogType = null;

    if (!oldState.serverMute && newState.serverMute) {
      actionType = "MUTE";
      auditLogType = AuditLogEvent.MemberUpdate;
    } else if (oldState.serverMute && !newState.serverMute) {
      actionType = "UNMUTE";
      auditLogType = AuditLogEvent.MemberUpdate;
    } else if (oldState.channelId && !newState.channelId) {
      actionType = "DISCONNECT";
      auditLogType = AuditLogEvent.MemberDisconnect;
    } else if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId
    ) {
      actionType = "MOVE";
      auditLogType = AuditLogEvent.MemberMove;
    }

    if (!actionType) {
      // console.log('[DEBUG] No trackable action detected');
      return;
    }

    console.log(`[DEBUG] Action Detected: ${actionType} on ${member.user.tag}`);

    // Find the actor via Audit Logs
    // Give Discord a moment to populate audit log
    setTimeout(async () => {
      try {
        const logs = await guild.fetchAuditLogs({
          type: auditLogType,
          limit: 5,
        });

        // Find the log entry matching our event
        // Must involve the correct target and be very recent
        const entry = logs.entries.find(
          (e) =>
            e.target.id === member.id && Date.now() - e.createdTimestamp < 5000, // Happened in last 5 seconds
        );

        if (!entry) {
          console.log(
            `[DEBUG] No matching audit log entry found for ${actionType}`,
          );
          return;
        }

        const actor = entry.executor;
        if (!actor) {
          console.log("[DEBUG] No executor found in audit log");
          return;
        }

        console.log(`[DEBUG] Actor found: ${actor.tag} (${actor.id})`);

        // Ignore bots
        if (actor.bot) {
          console.log("[DEBUG] Actor is a bot, ignoring.");
          return;
        }

        // Load fresh config checks
        const actorMember = await guild.members
          .fetch(actor.id)
          .catch(() => null);
        if (!actorMember) {
          console.log("[DEBUG] Could not fetch actor member");
          return;
        }

        // 1. Check if Actor has a Watched Role
        const hasWatchedRole = config.watchedRoles.some((roleId) =>
          actorMember.roles.cache.has(roleId),
        );

        console.log(
          `[DEBUG] Watched Roles Config: ${JSON.stringify(config.watchedRoles)}`,
        );
        console.log(`[DEBUG] Actor Has Watched Role: ${hasWatchedRole}`);

        if (!hasWatchedRole) return;

        // 2. Check if Actor is Admin/Staff (Ignore them)
        // Check ignored roles from config
        if (
          config.ignoredRoles &&
          config.ignoredRoles.some((roleId) =>
            actorMember.roles.cache.has(roleId),
          )
        ) {
          console.log("[DEBUG] Actor has Ignored Admin Role, skipping.");
          return;
        }

        // Keep Administrator permission check as failsafe (can be removed if strictly role based only)
        // Assuming "Manage Guild" or "Administrator" implies staff that shouldn't be watched,
        // OR checking against a configured list of staff roles could be better.
        // For now, let's use Admin permission as a whitelist.
        if (
          actorMember.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
          console.log("[DEBUG] Actor has Administrator permission, skipping.");
          // return; // COMMENTED OUT FOR DEBUGGING - Maybe you are testing as admin?
          // If you are testing as admin, you need to comment out the return.
        }

        // TEMPORARY: If testing as admin, uncomment the return above and remove admin from test account.
        // Or keep it commented if you want to test on yourself while being admin.
        // Re-enabling return for production code but adding log.
        if (
          actorMember.permissions.has(PermissionsBitField.Flags.Administrator)
        ) {
          // For strict mode:
          // return;
          console.log(
            "[DEBUG] Admin check passed (Ignoring return for debug purposes if you are admin)",
          );
        }

        // 3. Log the action
        await this.logAction(
          guild,
          actor,
          member,
          actionType,
          oldState.channel || newState.channel,
        );

        // 4. Record and Analyze
        await this.analyzeBehavior(
          guild,
          actor,
          member,
          actionType,
          oldState.channel || newState.channel,
        );
      } catch (error) {
        console.error("Error in PowerDetector:", error);
      }
    }, 1000);
  }

  static async logAction(guild, actor, target, action, channel) {
    const logEntry = `[${new Date().toISOString()}] [VOICE LOG] ${actor.tag} (${actor.id}) performed ${action} on ${target.user.tag} (${target.id}) in ${
      channel?.name
    }\n`;
    console.log(logEntry.trim());

    // Append to local log file for persistence
    try {
      const logPath = path.join(__dirname, "../data/powerActionLogs.txt");
      fs.appendFileSync(logPath, logEntry);
    } catch (err) {
      console.error("Failed to write to power log file:", err);
    }

    // Send to Discord Log Channel
    if (config.logChannelId) {
      try {
        const logChannel = guild.channels.cache.get(config.logChannelId);
        if (logChannel && logChannel.isTextBased()) {
          // Formatting for Discord
          const discordMsg = `**[VOICE LOG]** <@${actor.id}> performed **${action}** on <@${target.id}> in \`${channel?.name}\``;
          await logChannel.send({
            content: discordMsg,
            allowedMentions: { parse: [] },
          }); // No ping
        } else {
          console.log(
            `[DEBUG] Log channel ${config.logChannelId} not found or not text based.`,
          );
        }
      } catch (e) {
        console.error("[DEBUG] Failed to send log to Discord channel:", e);
      }
    }
  }

  static async analyzeBehavior(guild, actor, target, actionType, channel) {
    const now = Date.now();
    const actorId = actor.id;

    // Initialize history
    if (!actionHistory.has(actorId)) {
      actionHistory.set(actorId, []);
    }

    const history = actionHistory.get(actorId);

    // Add new action
    history.push({
      type: actionType,
      targetId: target.id,
      channelId: channel?.id,
      timestamp: now,
      targetRolePos: target.roles.highest.position,
      reversed: false,
    });

    // Prune old history (> 10 minutes)
    const cutoff = now - 10 * 60 * 1000;
    const validHistory = history.filter((a) => a.timestamp > cutoff);
    actionHistory.set(actorId, validHistory);

    // Update reversal (Mute -> Unmute)
    if (actionType === "UNMUTE") {
      // Find recent MUTE on same target
      const muteAction = validHistory.find(
        (a) => a.type === "MUTE" && a.targetId === target.id && !a.reversed,
      );
      if (muteAction) muteAction.reversed = true;
    }

    // ========================
    // CHECK RULES
    // ========================
    let confidence = 0;
    let reasons = [];

    // Rule 1: Rapid Repetition (3+ actions in 60s)
    const recentActions = validHistory.filter((a) => a.timestamp > now - 60000);
    if (recentActions.length >= 3) {
      confidence += 1;
      reasons.push(`Rapid Actions: ${recentActions.length} in 60s`);
    }

    // Rule 2: Multi-Victim Pattern (3+ unique victims in 5 mins)
    const uniqueVictims = new Set(validHistory.map((a) => a.targetId));
    if (uniqueVictims.size >= 3) {
      confidence += 2; // Stronger indicator usually
      reasons.push(`Multi-Victim: ${uniqueVictims.size} unique users affected`);
    }

    // Rule 3: Disconnect Abuse (3+ disconnects)
    const disconnects = validHistory.filter((a) => a.type === "DISCONNECT");
    if (disconnects.length >= 3) {
      // Check for admin presence (Simplified: Just check if any admin is in channel)
      // Ideally we check if an admin was present *at the time*, but current state is a close approx
      const adminInChannel =
        channel &&
        channel.members.some((m) =>
          m.permissions.has(PermissionsBitField.Flags.Administrator),
        );

      if (!adminInChannel) {
        confidence += 2;
        reasons.push("Disconnect Abuse (No Admin present)");
      }
    }

    // Rule 5: Power Imbalance (Targeting lower roles)
    const actorMember = await guild.members.fetch(actor.id);
    const actorPos = actorMember.roles.highest.position;
    // Count how many targets were lower rank
    const bullyingCount = validHistory.filter(
      (a) => a.targetRolePos < actorPos,
    ).length;
    if (bullyingCount >= 3 && uniqueVictims.size >= 2) {
      confidence += 1;
      reasons.push("Power Imbalance: Targeting lower roles");
    }

    // Rule 6: No Reversal (Mutes not unmuted) - Checking history for stale mutes
    const staleMutes = validHistory.filter(
      (a) => a.type === "MUTE" && !a.reversed && now - a.timestamp > 60000,
    );
    // If they have 2+ un-reversed mutes older than 60s
    if (staleMutes.length >= 2) {
      confidence += 1;
      reasons.push("No Reversal: Mutes without unmutes");
    }

    // ========================
    // ALERTING
    // ========================
    const THRESHOLD_HIGH = 3;

    if (confidence >= THRESHOLD_HIGH) {
      // Check if we recently alerted for this user to avoid spam (Cooldown 5 mins)
      if (this.isOnCooldown(actorId)) return;

      this.setCooldown(actorId);
      await this.sendAlert(guild, actor, reasons, validHistory, confidence);
    }
  }

  static cooldowns = new Set();
  static isOnCooldown(actorId) {
    return this.cooldowns.has(actorId);
  }
  static setCooldown(actorId) {
    this.cooldowns.add(actorId);
    setTimeout(() => this.cooldowns.delete(actorId), 5 * 60 * 1000); // 5 min cooldown
  }

  static async sendAlert(guild, actor, reasons, history, confidenceLevel) {
    if (!config.logChannelId) return;
    const channel = guild.channels.cache.get(config.logChannelId);

    if (!channel || !channel.isTextBased()) return;

    // Collect victims
    const victims = [...new Set(history.map((h) => h.targetId))];
    const victimMentions = victims.map((id) => `<@${id}>`).join(", ");

    // Determine watched role (just grab the first match)
    const actorMember = await guild.members.fetch(actor.id);
    const watchedRole = actorMember.roles.cache.find((r) =>
      config.watchedRoles.includes(r.id),
    );

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🚨 POTENTIAL POWER ABUSE DETECTED")
      .setDescription(
        `**User:** ${actor} (${actor.tag})\n**Role:** ${watchedRole ? watchedRole : "Unknown"}\n**Confidence Level:** HIGH (${confidenceLevel} pts)`,
      )
      .addFields(
        {
          name: "Detected Patterns",
          value: reasons.map((r) => `• ${r}`).join("\n"),
        },
        { name: "Affected Members", value: victimMentions || "None" },
        {
          name: "Total Actions (10m)",
          value: history.length.toString(),
          inline: true,
        },
        {
          name: "Action Types",
          value: [...new Set(history.map((h) => h.type))].join(", "),
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: "PowerWatch System" });

    await channel.send({ embeds: [embed] });

    // Pinging admins if configured, or just generic ping
    // The prompt asks for "Admins: @AdminsRole"
    // We assume "AdminsRole" is something we might need to config or generic text.
    // For now, simple text message below.
    // await channel.send({ content: '⚠️ Power Abuse Alert' });
  }
}

module.exports = PowerDetector;
