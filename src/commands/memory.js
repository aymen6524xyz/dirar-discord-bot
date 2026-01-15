const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'memory',
  description: 'Play a game of Memory (Match the Pairs)',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('memory')
    .setDescription('Play a game of Memory (Match the Pairs)'),

  async execute(message, args) {
    await this.startGame(message, message.author);
  },

  async executeSlash(interaction) {
    await interaction.deferReply();
    await this.startGame(interaction, interaction.user);
  },

  async startGame(ctx, user) {
    // 1. Setup Game
    // Grid: 4 rows x 5 cols = 20 cards (10 pairs)
    const emojis = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍊', '🍋', '🍍', '🥝', '🥥'];
    let cards = [...emojis, ...emojis];
    
    // Fisher-Yates Shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }

    const gameState = {
        cards: cards, // Array of 20 emojis
        revealed: new Set(), // Indices of permanently revealed (matched) cards
        temp: [], // Indices of currently flipped cards (0, 1, or 2)
        processing: false, // Lock input while "thinking" (showing mismatch)
        attempts: 0
    };

    const getComponents = (disableAll = false) => {
        const rows = [];
        for (let r = 0; r < 4; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < 5; c++) {
                const index = r * 5 + c;
                const card = gameState.cards[index];
                const isMatched = gameState.revealed.has(index);
                const isTemp = gameState.temp.includes(index);

                const btn = new ButtonBuilder().setCustomId(`mem_${index}`);

                if (isMatched) {
                    btn.setEmoji(card).setStyle(ButtonStyle.Success).setDisabled(true);
                } else if (isTemp) {
                    // Show card, but keep enabled? No, disable to prevent double click
                    // If it's a mismatch state (temp has 2), we might show Red?
                    // We handle style in logic, but standard temp show:
                    const isMismatch = gameState.temp.length === 2 && gameState.cards[gameState.temp[0]] !== gameState.cards[gameState.temp[1]];
                    btn.setEmoji(card).setStyle(isMismatch ? ButtonStyle.Danger : ButtonStyle.Primary).setDisabled(true);
                } else {
                    // Hidden
                    btn.setEmoji('🟦').setStyle(ButtonStyle.Secondary).setDisabled(disableAll);
                }
                row.addComponents(btn);
            }
            rows.push(row);
        }
        return rows;
    };

    const embed = new EmbedBuilder()
        .setTitle('🧩 Memory Match')
        .setDescription('Find all the matching pairs!')
        .setColor('Blue')
        .setFooter({ text: `Player: ${user.username} | Attempts: 0` });

    const replyContent = { embeds: [embed], components: getComponents() };
    
    let message;
    if (ctx.commandName === 'memory' || ctx.deferred) {
         message = await ctx.editReply(replyContent);
    } else {
         message = await ctx.reply(replyContent);
    }

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 10 * 60 * 1000 // 10 mins
    });

    collector.on('collect', async i => {
        if (i.user.id !== user.id) {
            return i.reply({ content: "⛔ This isn't your game!", ephemeral: true });
        }

        if (gameState.processing) {
            return i.deferUpdate(); // Ignore clicks while resetting
        }

        const index = parseInt(i.customId.split('_')[1]);

        // Logic
        gameState.temp.push(index);
        
        // 1. First Card Flipped
        if (gameState.temp.length === 1) {
            await i.update({ components: getComponents() });
        }
        // 2. Second Card Flipped
        else if (gameState.temp.length === 2) {
            gameState.attempts++;
            const idx1 = gameState.temp[0];
            const idx2 = gameState.temp[1];
            const match = gameState.cards[idx1] === gameState.cards[idx2];

            // Update UI to show second card
            const newEmbed = new EmbedBuilder(embed.data).setFooter({ text: `Player: ${user.username} | Attempts: ${gameState.attempts}` });
            
            if (match) {
                gameState.revealed.add(idx1);
                gameState.revealed.add(idx2);
                gameState.temp = [];
                
                // Check Win
                if (gameState.revealed.size === gameState.cards.length) {
                    newEmbed.setTitle('🎉 Memory Match - Victory!');
                    newEmbed.setDescription(`You found all pairs in **${gameState.attempts}** attempts!`);
                    newEmbed.setColor('Green');
                    await i.update({ embeds: [newEmbed], components: getComponents(true) });
                    collector.stop();
                } else {
                    await i.update({ embeds: [newEmbed], components: getComponents() });
                }
            } else {
                // Mismatch
                gameState.processing = true; // Lock
                
                // Show mismatch (Red)
                await i.update({ embeds: [newEmbed], components: getComponents() });
                
                // Wait 2s then hide
                setTimeout(async () => {
                    if (gameState.temp.length === 0) return; // Safety
                    gameState.temp = [];
                    gameState.processing = false;
                    try {
                        await message.edit({ components: getComponents() });
                    } catch (e) { console.error("Memory edit error:", e); }
                }, 2000);
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason === 'time') {
             const timeoutEmbed = new EmbedBuilder().setTitle('Memory Match').setDescription('Game timed out.').setColor('Grey');
             message.edit({ embeds: [timeoutEmbed], components: [] }).catch(e => {}); 
        }
    });
  }
};
