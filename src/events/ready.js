const { Events } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(
      `✅ Logged in as ${client.user.tag} | Servers: ${client.guilds.cache.size} | Users: ${client.users.cache.size}`,
    );
  },
};
