const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "jv",
  description: "Post the verification message",
  perms: 5,
  data: new SlashCommandBuilder()
    .setName("jv")
    .setDescription("Post the verification message"),

  async execute(message, args) {
    if (message.deletable) await message.delete().catch(() => {});
    await this.handleJv(message.channel);
  },

  async executeSlash(interaction) {
    await interaction.deferReply({ flags: "Ephemeral" });
    await this.handleJv(interaction.channel);
    await interaction.editReply("✅ Verification message posted.");
  },

  async handleJv(channel) {
    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle("🚨 VERIFICATION REQUIRED 🚨")
      .setDescription(
        "# 👋 WELCOME TO THE SERVER!\n" +
          "To keep our community safe and exclusive, we require a **brief voice verification**.\n\n" +
          "### ⚠️ __YOU MUST VERIFY TO SEE THE REST OF THE SERVER__\n\n" +
          "## 🎙️ **STEP 1: JOIN THE WAITING ROOM**\n" +
          "> Click the voice channel below to join the queue.\n" +
          "> **[➡️ JOIN WAITING ROOM NOW ⬅️](https://discord.com/channels/392360591114633217/1480344225341112411)**\n\n" +
          "## ⏳ **STEP 2: WAIT PATIENTLY**\n" +
          "> A staff member will be with you shortly.\n\n" +
          "## ⚠️ **IMPORTANT**\n" +
          "> • **Have your microphone ready.** 🎤\n" +
          "> • Be respectful to the staff. ❤️\n" +
          "> • Do not DM staff members asking for verification. 🚫",
      )
      .setThumbnail(
        "https://cdn.discordapp.com/attachments/1082257882935984128/1125775607549149265/standard.gif",
      )
      .setImage(
        "https://media.discordapp.net/attachments/1247958742847258705/1252187659573432320/verification.gif?ex=67c570b8&is=67c41f38&hm=b2a2651480119156686153676785020108781907865675e608064c575003328e&",
      )
      .setFooter({
        text: "🔒 Security System • Verification Required",
      })
      .setTimestamp();

    await channel.send({
      content: "**Action Required!** Please read below.",
      embeds: [embed],
    });
    // send the link of the room in the channel
    await channel.send(
      "🔗 **Join the waiting room here:** https://discord.com/channels/392360591114633217/1480344225341112411",
    );
  },
};
