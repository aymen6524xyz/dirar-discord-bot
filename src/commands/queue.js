const { getMusicManager } = require("../music/musicManager");

module.exports = {
  name: "queue",
  description: "Show the current music queue.",
  perms: 3,
  async execute(message) {
    if (!message.guild) return message.reply("❌ This command can only be used in a server.");
    if (!message.member?.voice?.channel) return message.reply("❌ Join a voice channel first.");
    const { current, queue, playing } = getMusicManager(message.guild.id).status();
    if (!current && !queue.length) return message.reply("📭 The music queue is empty.");
    const lines = [];
    if (current) lines.push(`**Now ${playing ? "playing" : "loading"}:** ${current.title}`);
    queue.forEach((track, index) => lines.push(`${index + 1}. ${track.title}`));
    return message.reply(`🎵 **Music queue**\n${lines.join("\n")}`);
  },
};
