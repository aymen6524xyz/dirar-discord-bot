const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'tictactoe',
  description: 'Play Tic-Tac-Toe against the bot or a friend',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play Tic-Tac-Toe')
    .addUserOption(option => 
      option.setName('opponent')
        .setDescription('User to challenge (leave empty to play bot)')
        .setRequired(false)),

  async execute(message, args) {
    let opponent;
    if (message.mentions.users.size > 0) {
      opponent = message.mentions.users.first();
    }
    await this.startGame(message, message.author, opponent);
  },

  async executeSlash(interaction) {
    const opponent = interaction.options.getUser('opponent');
    await interaction.deferReply();
    await this.startGame(interaction, interaction.user, opponent);
  },

  async startGame(ctx, player1, player2) {
    // If player2 is null or bot, it's PvE
    const isPvE = !player2 || player2.bot;
    if (!player2) player2 = ctx.client.user;

    // Game State
    let board = Array(9).fill(null);
    let turn = player1.id; // Player 1 starts
    let gameOver = false;
    const markers = { [player1.id]: 'X', [player2.id]: 'O' };

    const getComponents = (disabled = false) => {
      const rows = [];
      for (let i = 0; i < 3; i++) {
        const row = new ActionRowBuilder();
        for (let j = 0; j < 3; j++) {
          const index = i * 3 + j;
          const style = board[index] === 'X' ? ButtonStyle.Primary : (board[index] === 'O' ? ButtonStyle.Danger : ButtonStyle.Secondary);
          // Use '➖' for empty, because Discord rejects whitespace-only labels
          const label = board[index] || '➖';
          
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`ttt_${index}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(disabled || board[index] !== null)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const embed = new EmbedBuilder()
      .setTitle('Tic-Tac-Toe')
      .setDescription(`${player1} vs ${player2}\n\nTurn: <@${turn}>`)
      .setColor('Blue');

    // Handle initial reply/edit
    let reply; 
    const gameContent = { embeds: [embed], components: getComponents() };

    if (ctx.commandName === 'tictactoe' || ctx.deferred) { // Slash command (already deferred or replied)
         reply = await ctx.editReply(gameContent);
    } else { // Message command
         reply = await ctx.reply(gameContent);
    }
    
    // Ensure we have the message object for the collector
    const message = ctx.commandName ? await ctx.fetchReply() : reply;

    const collector = message.createMessageComponentCollector({ 
      componentType: ComponentType.Button, 
      time: 60000 * 5 // 5 mins
    });

    collector.on('collect', async i => {
        // Verification
        // If it's PvE, only Player 1 interactions matter (Bot doesn't click buttons)
        if (i.user.id !== turn) {
            // Check if invalid user trying to click
            if (![player1.id, player2.id].includes(i.user.id)) {
                 await i.reply({ content: "This isn't your game!", ephemeral: true });
                 return;
            }
            // Check if it's the other player's turn (in PvP)
            if (i.user.id === player2.id && !isPvE) {
                 await i.reply({ content: "It's not your turn!", ephemeral: true });
                 return;
            }
            if (i.user.id === player1.id && !isPvE && turn === player2.id) {
                 await i.reply({ content: "It's not your turn!", ephemeral: true });
                 return;
            }
            // Otherwise, it might be weird state, just ignore
            return;
        }

        const index = parseInt(i.customId.split('_')[1]);
        board[index] = markers[turn];

        // Check Win/Draw
        let winner = this.checkWin(board);
        let draw = !board.includes(null);

        if (winner || draw) {
            gameOver = true;
            collector.stop();
            const endEmbed = new EmbedBuilder()
                .setTitle('Tic-Tac-Toe - Game Over')
                .setColor(winner ? 'Green' : 'Gold')
                .setDescription(winner === 'X' ? `🎉 **${player1.username}** wins!` : (winner === 'O' ? `🎉 **${player2.username}** wins!` : "🤝 It's a draw!"));
            
            await i.update({ embeds: [endEmbed], components: getComponents(true) });
            return;
        }

        // Switch Turn
        turn = (turn === player1.id) ? player2.id : player1.id;
        
        // AI Turn Handling (PvE only)
        if (isPvE && turn === ctx.client.user.id) {
             // Defer update so we can calculate
             await i.update({ 
                content: null,
                embeds: [new EmbedBuilder().setTitle('Tic-Tac-Toe').setDescription(`${player1} vs ${player2}\n\nTurn: <@${turn}>`).setColor('Blue')],
                components: getComponents(true) // Disable while bot thinks (cosmetic)
            });

             // Bot makes move
             // Small delay for realism
             await new Promise(r => setTimeout(r, 600));

             const botMove = this.getBestMove(board, 'O');
             if (botMove !== -1) board[botMove] = 'O';

             const botWinner = this.checkWin(board);
             const botDraw = !board.includes(null);

             if (botWinner || botDraw) {
                gameOver = true;
                collector.stop();
                const endEmbed = new EmbedBuilder()
                    .setTitle('Tic-Tac-Toe - Game Over')
                    .setColor(botWinner ? 'Red' : 'Gold')
                    .setDescription(botWinner ? `🤖 **I win!**` : "🤝 It's a draw!");
                
                // We use message.edit because we already replied to the interaction
                await message.edit({ embeds: [endEmbed], components: getComponents(true) });
             } else {
                 // Switch back to player
                turn = player1.id;
                await message.edit({ 
                    content: null,
                    embeds: [new EmbedBuilder().setTitle('Tic-Tac-Toe').setDescription(`${player1} vs ${player2}\n\nTurn: <@${turn}>`).setColor('Blue')],
                    components: getComponents() 
                });
             }
        } else {
             // PvP Update
             await i.update({ 
                content: null,
                embeds: [new EmbedBuilder().setTitle('Tic-Tac-Toe').setDescription(`${player1} vs ${player2}\n\nTurn: <@${turn}>`).setColor('Blue')],
                components: getComponents() 
            });
        }
    });

    collector.on('end', (collected, reason) => {
        if (!gameOver && reason === 'time') {
             const timeoutEmbed = new EmbedBuilder().setTitle('Tic-Tac-Toe').setDescription('Game timed out.').setColor('Grey');
             // Try to edit if possible
             message.edit({ embeds: [timeoutEmbed], components: [] }).catch(e => {}); 
        }
    });
  },

  checkWin(board) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (const combo of wins) {
        if (board[combo[0]] && board[combo[0]] === board[combo[1]] && board[combo[0]] === board[combo[2]]) {
            return board[combo[0]];
        }
    }
    return null;
  },

  // Minimax AI for unbeatable bot (or nearly)
  getBestMove(board, player) {
    // 1. Can I win now?
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = player;
            if (this.checkWin(board) === player) {
                return i; // Winning move
            }
            board[i] = null; // Undo
        }
    }

    // 2. Will opponent win next? Block them.
    const opponent = player === 'O' ? 'X' : 'O';
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            board[i] = opponent;
            if (this.checkWin(board) === opponent) {
                return i; // Blocking move
            }
            board[i] = null; // Undo
        }
    }

    // 3. Take center if available
    if (board[4] === null) return 4;

    // 4. Take random corner
    const corners = [0, 2, 6, 8].filter(i => board[i] === null);
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

    // 5. Take random side
    const sides = [1, 3, 5, 7].filter(i => board[i] === null);
    if (sides.length > 0) return sides[Math.floor(Math.random() * sides.length)];
    
    return board.indexOf(null); // Fallback
  }
};
