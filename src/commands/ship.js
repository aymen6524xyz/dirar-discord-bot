const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'ship',
  description: 'Calculate match percentage between two users',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calculate match percentage between two users')
    .addUserOption(option => 
      option.setName('user1')
        .setDescription('First user')
        .setRequired(true))
    .addUserOption(option => 
      option.setName('user2')
        .setDescription('Second user (defaults to you if omitted)')
        .setRequired(false)),

  async execute(message, args) {
    if (message.mentions.users.size < 1) {
        return message.reply('❗ Usage: `d?ship <@user1> [@user2]`');
    }

    const users = Array.from(message.mentions.users.values());
    let user1, user2;

    if (users.length === 1) {
        user1 = message.author;
        user2 = users[0];
    } else {
        user1 = users[0];
        user2 = users[1];
    }

    await this.sendShip(message, user1, user2);
  },

  async executeSlash(interaction) {
    const user1 = interaction.options.getUser('user1');
    const user2 = interaction.options.getUser('user2') || interaction.user;

    // Swap if user2 is the command user to be consistent
    const first = (user2.id === interaction.user.id) ? interaction.user : user1;
    const second = (user2.id === interaction.user.id) ? user1 : user2;

    await interaction.deferReply();
    await this.sendShip(interaction, first, second);
  },

  async sendShip(ctx, user1, user2) {
    // Generate a percentage based on IDs so it's consistent for the pair
    // Simply adding IDs and modulo 101 gives a consistent number
    // We mix it a bit to make it seemingly random
    const num1 = BigInt(user1.id);
    const num2 = BigInt(user2.id);
    const sum = num1 + num2;
    // Simple pseudo-random using the sum
    const percentage = Number(sum % 101n);
    
    let description = '';
    
    // Custom messages based on percentage
    if (percentage === 69) description = "Nice. 😏";
    else if (percentage === 0) description = "No chance. 🧊";
    else if (percentage < 20) description = "Matches made in hell. 🔥";
    else if (percentage < 50) description = "Maybe consistent effort works? 🛠️";
    else if (percentage < 80) description = "Pretty good match! 💖";
    else if (percentage < 100) description = "True love! 💍";
    else if (percentage === 100) description = "Soulmates! 🌟";

    // Progress Bar
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    const bar = '🟥'.repeat(filled) + '⬜'.repeat(empty);

    const embed = new EmbedBuilder()
      .setTitle('💗 Match Calculator')
      .setDescription(`**${user1.username}** x **${user2.username}**\n\n**${percentage}%**\n${bar}\n\n${description}`)
      .setColor(percentage > 50 ? 'Red' : 'Blue')
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/2107/2107957.png'); // Heart icon

    if (ctx.editReply) {
        await ctx.editReply({ embeds: [embed] });
    } else {
        await ctx.reply({ embeds: [embed] });
    }
  }
};
