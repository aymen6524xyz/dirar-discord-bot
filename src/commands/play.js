const play = require("play-dl");
const { getMusicManager } = require("../music/musicManager");

function getVideoUrl(video) {
  if (typeof video?.url === "string" && video.url.length > 0) return video.url;
  if (typeof video?.id === "string" && video.id.length > 0) {
    return `https://www.youtube.com/watch?v=${video.id}`;
  }
  return null;
}

module.exports = {
  name: "play",
  description: "Play a YouTube URL or search result in your voice channel.",
  perms: 3,
  async execute(message, args) {
    if (!message.guild) return message.reply("❌ This command can only be used in a server.");
    const channel = message.member?.voice?.channel;
    if (!channel) return message.reply("❌ Join a voice channel first.");
    const query = args.join(" ").trim();
    if (!query) return message.reply("❌ Provide a YouTube URL or search query.");
    try {
      let result;
      if (play.yt_validate(query) === "video") {
        const info = await play.video_basic_info(query);
        result = {
          url: getVideoUrl(info.video_details) || query,
          title: info.video_details.title,
          duration: info.video_details.durationRaw,
        };
      } else {
        const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (!results.length) return message.reply("❌ No YouTube results found.");
        const url = getVideoUrl(results[0]);
        if (!url) {
          throw new Error("YouTube search returned a result without a video URL or ID.");
        }
        result = { url, title: results[0].title, duration: results[0].durationRaw };
      }
      const manager = getMusicManager(message.guild.id);
      const position = await manager.enqueue(result, channel);
      return message.reply(`✅ **${result.title}**${result.duration ? ` (${result.duration})` : ""} added to the queue. Position: ${position}.`);
    } catch (error) {
      console.error("Failed to queue YouTube track:", error);
      return message.reply("❌ I could not play that track. Check my voice permissions and try another URL.");
    }
  },
};
