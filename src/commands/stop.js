const { getMusicManager } = require("../music/musicManager");

module.exports = {
  name: "stop",
  description: "Stop playback and clear the music queue.",
  perms: 3,
  async execute(message) {
    if (!message.guild) return message.reply("❌ This command can only be used in a server.");
    if (!message.member?.voice?.channel) return message.reply("❌ Join a voice channel first.");
    getMusicManager(message.guild.id).stop();
    return message.reply("⏹️ Playback stopped and the queue was cleared.");
  },
};
