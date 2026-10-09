const { getMusicManager } = require("../music/musicManager");

module.exports = {
  name: "skip",
  description: "Skip the currently playing track.",
  perms: 3,
  async execute(message) {
    if (!message.guild) return message.reply("❌ This command can only be used in a server.");
    if (!message.member?.voice?.channel) return message.reply("❌ Join a voice channel first.");
    return message.reply(getMusicManager(message.guild.id).skip() ? "⏭️ Skipped the current track." : "❌ Nothing is playing.");
  },
};
