const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  name: 'tictactoe',
  description: 'Play a game of Tic-Tac-Toe',
  perms: 3, // Everyone
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play a game of Tic-Tac-Toe')
    .addUserOption(option => 
      option.setName('opponent')
        .setDescription('The user you want to play against')
        .setRequired(true)),

  async execute(message, args) {
    const opponent = message.mentions.users.first();
    if (!opponent) return message.reply('❗ Please mention a user to play against.');
    // if (opponent.bot) return message.reply('❌ You cannot play against bots.'); // Removed check
    if (opponent.id === message.author.id) return message.reply('❌ You cannot play against yourself.');

    await this.startGame(message, message.author, opponent);
  },

  async executeSlash(interaction) {
    const opponent = interaction.options.getUser('opponent');
    // if (opponent.bot) return interaction.reply({ content: '❌ You cannot play against bots.', flags: 'Ephemeral' }); // Removed check
    if (opponent.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot play against yourself.', flags: 'Ephemeral' });

    await this.startGame(interaction, interaction.user, opponent);
  },

  async startGame(context, player1, player2) {
    // Determine if context is message or interaction
    const isInteraction = context.isCommand?.();

    // 3x3 Grid initialized with custom IDs
    // 0 1 2
    // 3 4 5
    // 6 7 8
    
    // Create Buttons
    const rows = [
        new ActionRowBuilder().addComponents(
             this.createButton(0), this.createButton(1), this.createButton(2)
        ),
        new ActionRowBuilder().addComponents(
             this.createButton(3), this.createButton(4), this.createButton(5)
        ),
        new ActionRowBuilder().addComponents(
             this.createButton(6), this.createButton(7), this.createButton(8)
        )
    ];

    const content = `❌ **${player1.username}** vs ⭕ **${player2.username}**\nIt is **${player1.username}**'s turn!`;
    
    let gameMessage;
    if (isInteraction) {
        gameMessage = await context.reply({ content, components: rows, fetchReply: true });
    } else {
        gameMessage = await context.channel.send({ content, components: rows });
    }

    // Game State
    const gameState = {
        board: [0, 0, 0, 0, 0, 0, 0, 0, 0], // 0=empty, 1=X, 2=O
        currentPlayer: player1.id,
        players: {
            [player1.id]: { symbol: '❌', value: 1, user: player1 },
            [player2.id]: { symbol: '⭕', value: 2, user: player2 }
        },
        over: false
    };

    // Collector
    const collector = gameMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes timeout
    });

    collector.on('collect', async i => {
        if (![player1.id, player2.id].includes(i.user.id)) {
            return i.reply({ content: "⛔ This isn't your game!", flags: 'Ephemeral' });
        }

        if (i.user.id !== gameState.currentPlayer) {
            return i.reply({ content: "⏳ It's not your turn!", flags: 'Ephemeral' });
        }

        const index = parseInt(i.customId.split('_')[1]);
        
        // Update Board
        gameState.board[index] = gameState.players[i.user.id].value;
        
        // Check Winner
        const winner = this.checkWin(gameState.board);
        const isTie = !gameState.board.includes(0);

        if (winner || isTie) {
            gameState.over = true;
            this.updateBoardUI(rows, gameState.board);
            
            // Disable all buttons
            rows.forEach(row => row.components.forEach(btn => btn.setDisabled(true)));

            if (winner) {
                await i.update({ content: `🏆 **${gameState.players[winner === 1 ? player1.id : player2.id].user.username}** wins!`, components: rows });
            } else {
                await i.update({ content: `🤝 It's a draw!`, components: rows });
            }
            collector.stop();
            return;
        }

        // Switch Turn
        gameState.currentPlayer = gameState.currentPlayer === player1.id ? player2.id : player1.id;
        
        this.updateBoardUI(rows, gameState.board);
        
        // --- BOT MOVE LOGIC ---
        // If the new current player is a bot, make a move automatically
        if (gameState.players[gameState.currentPlayer].user.bot) {
            
            // 1. Update UI to show Bot's turn briefly (optional, maybe skip to make it fast)
             await i.update({ 
                content: `❌ **${player1.username}** vs ⭕ **${player2.username}**\n🤖 Bot is thinking...`, 
                components: rows 
            });

            // Delay purely for UX so it doesn't feel instant/robotic
            await new Promise(r => setTimeout(r, 1000));

            // Bot makes a move
            const botMoveIndex = this.getBotMove(gameState.board);
            
            if (botMoveIndex !== -1) {
                gameState.board[botMoveIndex] = gameState.players[gameState.currentPlayer].value;
                
                // Check Win for Bot
                const botWinner = this.checkWin(gameState.board);
                const botIsTie = !gameState.board.includes(0);

                if (botWinner || botIsTie) {
                    gameState.over = true;
                    this.updateBoardUI(rows, gameState.board);
                    rows.forEach(row => row.components.forEach(btn => btn.setDisabled(true)));

                    if (botWinner) {
                        await gameMessage.edit({ content: `🏆 **${gameState.players[botWinner === 1 ? player1.id : player2.id].user.username}** wins!`, components: rows });
                    } else {
                        await gameMessage.edit({ content: `🤝 It's a draw!`, components: rows });
                    }
                    collector.stop();
                    return;
                }

                // Switch back to human
                gameState.currentPlayer = gameState.currentPlayer === player1.id ? player2.id : player1.id;
            }
    } else {
         // Normal update for human switch
         await i.update({ 
            content: `❌ **${player1.username}** vs ⭕ **${player2.username}**\nIt is **${gameState.players[gameState.currentPlayer].user.username}**'s turn!`, 
            components: rows 
        });
        return;
    }

    // Final update UI after bot moved (to show human it is their turn again)
    this.updateBoardUI(rows, gameState.board);
    await gameMessage.edit({ 
        content: `❌ **${player1.username}** vs ⭕ **${player2.username}**\nIt is **${gameState.players[gameState.currentPlayer].user.username}**'s turn!`, 
        components: rows 
    });

});

    collector.on('end', (collected, reason) => {
        if (reason === 'time' && !gameState.over) {
            gameMessage.edit({ content: '⏱️ Game timed out.', components: [] });
        }
    });
  },

  getBotMove(board) {
      // Simple AI: 1. Try to win, 2. Block, 3. Random
      const emptyIndices = board.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
      if (emptyIndices.length === 0) return -1;
      return emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
  },

  createButton(index) {
    return new ButtonBuilder()
      .setCustomId(`ttt_${index}`)
      .setLabel('➖')
      .setStyle(ButtonStyle.Secondary);
  },

  updateBoardUI(rows, board) {
    let i = 0;
    rows.forEach(row => {
        row.components.forEach(btn => {
            const val = board[i];
            if (val === 1) {
                btn.setLabel('X').setStyle(ButtonStyle.Danger).setDisabled(true);
            } else if (val === 2) {
                btn.setLabel('O').setStyle(ButtonStyle.Primary).setDisabled(true);
            }
            i++;
        });
    });
  },

  checkWin(board) {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];

    for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a]; // Returns 1 or 2
        }
    }
    return null;
  }
};
