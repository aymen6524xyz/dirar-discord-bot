const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'rps',
  description: 'Play Rock Paper Scissors against the bot',
  perms: 3, // Everyone
  data: new SlashCommandBuilder()
    .setName('rps')
    .setDescription('Play Rock Paper Scissors against the bot'),

  async execute(message, args) {
    await this.startGame(message, message.author);
  },

  async executeSlash(interaction) {
    await interaction.deferReply();
    await this.startGame(interaction, interaction.user);
  },

  async startGame(ctx, user) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('rock').setLabel('Rock').setEmoji('🪨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('paper').setLabel('Paper').setEmoji('📄').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('scissors').setLabel('Scissors').setEmoji('✂️').setStyle(ButtonStyle.Primary)
      );

    const embed = new EmbedBuilder()
      .setTitle('Rock Paper Scissors')
      .setDescription('Choose your weapon!')
      .setColor('Blue');

    const reply = ctx.editReply ? await ctx.editReply({ embeds: [embed], components: [row] }) : await ctx.reply({ embeds: [embed], components: [row] });
    const message = ctx.editReply ? await ctx.fetchReply() : reply;

    const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 15000,
        filter: i => i.user.id === user.id 
    });

    collector.on('collect', async i => {
        const choices = ['rock', 'paper', 'scissors'];
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        const userChoice = i.customId;

        let result;
        if (userChoice === botChoice) result = "It's a tie! 👔";
        else if (
            (userChoice === 'rock' && botChoice === 'scissors') ||
            (userChoice === 'paper' && botChoice === 'rock') ||
            (userChoice === 'scissors' && botChoice === 'paper')
        ) result = "You win! 🎉";
        else result = "I win! 😈";

        const resultEmbed = new EmbedBuilder()
            .setTitle('Rock Paper Scissors')
            .addFields(
                { name: 'Your Choice', value: `${this.getEmoji(userChoice)} ${this.capitalize(userChoice)}`, inline: true },
                { name: 'My Choice', value: `${this.getEmoji(botChoice)} ${this.capitalize(botChoice)}`, inline: true },
                { name: 'Result', value: result, inline: false }
            )
            .setColor(result.includes('win') ? 'Green' : (result.includes('tie') ? 'Yellow' : 'Red'));

        await i.update({ embeds: [resultEmbed], components: [] });
        collector.stop();
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder().setTitle('Game Timeout').setDescription('You took too long to choose!');
            if (ctx.editReply) ctx.editReply({ embeds: [timeoutEmbed], components: [] });
            else message.edit({ embeds: [timeoutEmbed], components: [] });
        }
    });
  },

  getEmoji(choice) {
      if (choice === 'rock') return '🪨';
      if (choice === 'paper') return '📄';
      if (choice === 'scissors') return '✂️';
  },

  capitalize(s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
};
