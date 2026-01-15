const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'minesweeper',
  description: 'Play a game of Interactive Minesweeper (5x5)',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('Play a game of Interactive Minesweeper')
    .addIntegerOption(option => 
      option.setName('mines')
        .setDescription('Number of mines to place')
        .setMinValue(1)
        .setMaxValue(10)),

  async execute(message, args) {
    let mines = 5;
    if (args[0] && !isNaN(args[0])) {
        mines = parseInt(args[0]);
        if (mines < 1) mines = 1;
        if (mines > 10) mines = 10;
    }
    await this.startGame(message, message.author, mines);
  },

  async executeSlash(interaction) {
    const mines = interaction.options.getInteger('mines') || 5;
    await interaction.deferReply();
    await this.startGame(interaction, interaction.user, mines);
  },

  async startGame(ctx, user, mineCount) {
    // 1. Generate Board (5x5)
    const rows = 5;
    const cols = 5;
    const board = this.generateBoard(rows, cols, mineCount);
    
    // Game State
    const gameState = {
        board: board, // flat array of 25 items (0-8 or 9 for mine)
        revealed: new Set(),
        mines: mineCount,
        over: false,
        won: false
    };

    const getComponents = () => {
        const components = [];
        for (let r = 0; r < rows; r++) {
            const row = new ActionRowBuilder();
            for (let c = 0; c < cols; c++) {
                const index = r * cols + c;
                const cellValue = gameState.board[index];
                const isRevealed = gameState.revealed.has(index);
                const isMine = cellValue === 9;

                const btn = new ButtonBuilder().setCustomId(`ms_${index}`);

                if (gameState.over) {
                    // Game Over / Win State
                    // Reveal everything
                    btn.setDisabled(true);
                    if (isMine) {
                         btn.setEmoji('💣').setStyle(gameState.won ? ButtonStyle.Success : ButtonStyle.Danger);
                         // If it was the clicked mine that killed us, maybe mark it? 
                         // Hard to track specific click here without passing it, but standard reveal is fine.
                    } else {
                         btn.setEmoji(this.getNumberEmoji(cellValue)).setStyle(ButtonStyle.Secondary);
                    }
                } else if (isRevealed) {
                    // Revealed Cell
                    btn.setDisabled(true);
                    if (isMine) {
                        // Should not happen unless game over logic failed
                        btn.setEmoji('💥').setStyle(ButtonStyle.Danger);
                    } else {
                        btn.setEmoji(this.getNumberEmoji(cellValue)).setStyle(ButtonStyle.Secondary);
                    }
                } else {
                    // Hidden Cell
                    btn.setEmoji('🟦').setStyle(ButtonStyle.Primary);
                }
                
                row.addComponents(btn);
            }
            components.push(row);
        }
        return components;
    };

    // Initial Message
    const embed = new EmbedBuilder()
        .setTitle(`💣 Minesweeper (${mineCount} Mines)`)
        .setDescription('Click the blue squares to reveal them. Avoid the mines!')
        .setColor('Blue')
        .setFooter({ text: `Player: ${user.username}` });

    const replyContent = { embeds: [embed], components: getComponents() };
    
    let message;
    if (ctx.commandName === 'minesweeper' || ctx.deferred) {
         message = await ctx.editReply(replyContent);
    } else {
         message = await ctx.reply(replyContent);
    }
    
    // Message Collector
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 5 * 60 * 1000 // 5 mins
    });

    collector.on('collect', async i => {
        if (i.user.id !== user.id) {
            return i.reply({ content: "⛔ This isn't your game!", ephemeral: true });
        }

        const index = parseInt(i.customId.split('_')[1]);
        const cellValue = gameState.board[index];

        if (cellValue === 9) {
            // Hit Mine
            gameState.over = true;
            gameState.won = false;
            gameState.revealed.add(index); // Ensure this one is definitely revealed
            
            const endEmbed = new EmbedBuilder()
                .setTitle('💥 Game Over!')
                .setDescription(`You hit a mine! Better luck next time.`)
                .setColor('Red');
            
            await i.update({ embeds: [endEmbed], components: getComponents() });
            collector.stop();
        } else {
            // Safe Click
            // Flood Fill if 0
            this.revealCell(gameState, index, rows, cols);

            // Check Win
            // Win = (Total Cells - Mines) == Revealed Count
            const safeCells = (rows * cols) - gameState.mines;
            if (gameState.revealed.size === safeCells) {
                gameState.over = true;
                gameState.won = true;

                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 You Win!')
                    .setDescription(`You cleared the field! Great job!`)
                    .setColor('Green');
                
                await i.update({ embeds: [winEmbed], components: getComponents() });
                collector.stop();
            } else {
                // Continue
                await i.update({ components: getComponents() });
            }
        }
    });

    collector.on('end', (collected, reason) => {
        if (!gameState.over && reason === 'time') {
            const timeoutEmbed = new EmbedBuilder().setTitle('Minesweeper').setDescription('Game timed out.').setColor('Grey');
            message.edit({ embeds: [timeoutEmbed], components: [] }).catch(e => {});
        }
    });
  },

  revealCell(gameState, index, rows, cols) {
      if (gameState.revealed.has(index)) return;
      
      gameState.revealed.add(index);
      
      // If it's a 0, reveal neighbors
      if (gameState.board[index] === 0) {
          const r = Math.floor(index / cols);
          const c = index % cols;

          for (let i = -1; i <= 1; i++) {
              for (let j = -1; j <= 1; j++) {
                  if (i === 0 && j === 0) continue;
                  const nr = r + i;
                  const nc = c + j;
                  if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                      const nIndex = nr * cols + nc;
                      if (!gameState.revealed.has(nIndex)) {
                          this.revealCell(gameState, nIndex, rows, cols);
                      }
                  }
              }
          }
      }
  },

  generateBoard(rows, cols, mines) {
    const size = rows * cols;
    const board = Array(size).fill(0);
    
    let minesPlaced = 0;
    while (minesPlaced < mines) {
        const idx = Math.floor(Math.random() * size);
        if (board[idx] !== 9) {
            board[idx] = 9;
            minesPlaced++;
        }
    }

    // Calculate numbers
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const idx = r * cols + c;
            if (board[idx] === 9) continue;

            let count = 0;
            // Check 8 neighbors
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    if (i === 0 && j === 0) continue;
                    const nr = r + i;
                    const nc = c + j;
                    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                        const nIdx = nr * cols + nc;
                        if (board[nIdx] === 9) count++;
                    }
                }
            }
            board[idx] = count;
        }
    }
    return board;
  },

  getNumberEmoji(num) {
      const map = {
          0: '⬜', // Empty safe
          1: '1️⃣',
          2: '2️⃣',
          3: '3️⃣',
          4: '4️⃣',
          5: '5️⃣',
          6: '6️⃣',
          7: '7️⃣',
          8: '8️⃣',
          9: '💣'
      };
      return map[num] || '❓';
  }
};
