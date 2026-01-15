const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: '8ball',
  description: 'Ask the magic 8-ball a question',
  perms: 3, // Everyone
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option => 
      option.setName('question')
        .setDescription('The question you want to ask')
        .setRequired(true)),

  async execute(message, args) {
    if (args.length === 0) return message.reply('🎱 You need to ask a question!');
    const question = args.join(' ');
    await this.send8Ball(message, question, message.author);
  },

  async executeSlash(interaction) {
    const question = interaction.options.getString('question');
    await interaction.deferReply();
    await this.send8Ball(interaction, question, interaction.user);
  },

  async send8Ball(ctx, question, user) {
    const responses = [
      // Positive
      "It is certain.", "It is decidedly so.", "Without a doubt.", "Yes definitely.", "You may rely on it.",
      "As I see it, yes.", "Most likely.", "Outlook good.", "Yes.", "Signs point to yes.",
      // Neutral
      "Reply hazy, try again.", "Ask again later.", "Better not tell you now.", "Cannot predict now.", "Concentrate and ask again.",
      // Negative
      "Don't count on it.", "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    // Choose color based on sentiment roughly
    let color = 0x95A5A6; // Gray
    if (responses.indexOf(randomResponse) < 10) color = 0x2ECC71; // Green
    else if (responses.indexOf(randomResponse) > 14) color = 0xE74C3C; // Red

    const embed = new EmbedBuilder()
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question },
        { name: 'Answer', value: randomResponse }
      )
      .setColor(color)
      .setFooter({ text: `Asked by ${user.username}`, iconURL: user.displayAvatarURL() });

    if (ctx.editReply) {
        await ctx.editReply({ embeds: [embed] });
    } else {
        await ctx.reply({ embeds: [embed] });
    }
  }
};
