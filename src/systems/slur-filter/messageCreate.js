const { Events } = require("discord.js");

const trackers = new Map();

// Regex to catch variants of the n-word. 
// Uses word boundaries \b to avoid matches in words like "snigger" or "nigeria".
const nWordRegex = /\b(n[i1!l¡]+[gq8]{2,}[e3a@4]+r?s?|n[i1!l¡]+[gq8]+a+s?)\b/i;
const basicRegex = /\bnig+[ea]r?s?\b/i;

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return; // Only process in servers

    // Ignore users who have the "monarch" role
    if (message.member && (message.member.roles.cache.has('1336779954364350607') || message.member.roles.cache.some(r => r.name.toLowerCase().includes('monarch')))) return;

    const content = message.content.toLowerCase();
    
    // Check if the message contains the forbidden word
    if (!nWordRegex.test(content) && !basicRegex.test(content)) return;

    // Delete the offending message immediately
    try {
      await message.delete();
    } catch (e) {
      console.error("Could not delete message early:", e.message);
    }

    const userId = message.author.id;
    let userData = trackers.get(userId);

    // Initialize user tracker if they don't have one
    if (!userData) {
      userData = { count: 0, timer: null };
      trackers.set(userId, userData);
    }

    userData.count++;

    // Clear previous reset timer
    if (userData.timer) {
      clearTimeout(userData.timer);
    }

    // Set new 15-minute timer
    userData.timer = setTimeout(() => {
      // Free memory and reset count to 0 by removing from Map
      trackers.delete(userId);
    }, 15 * 60 * 1000);

    const count = userData.count;

    if (count === 1) {
      // First infraction: just ping and text
      try {
        await message.channel.send(`<@${userId}> Please don't say that again`);
      } catch (e) {
        console.error("Could not send warning message:", e.message);
      }
    } else {
      // Subsequent infractions: Timeout scaling by 10 seconds each time
      const timeoutSeconds = (count - 1) * 10;
      const timeoutMs = timeoutSeconds * 1000;
      
      try {
        // Checking if the bot has permission to time out the user
        if (message.member && message.member.moderatable) {
          await message.member.timeout(timeoutMs, "Auto-mod: Used forbidden slur multiple times.");
          await message.channel.send(`*slap* <@${userId}> watch your language !`);
        } else {
          await message.channel.send(`*slap* <@${userId}> watch your language !`);
        }
      } catch (e) {
        console.error("Could not timeout user:", e.message);
        await message.channel.send(`<@${userId}> Please don't say that again`);
      }
    }
  }
};
