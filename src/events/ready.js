const { Events } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`📊 Bot is in ${client.guilds.cache.size} server(s)`);
    console.log(`👥 Serving ${client.users.cache.size} user(s)`);
  },
};

