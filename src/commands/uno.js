const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType, 
    EmbedBuilder, 
    StringSelectMenuBuilder 
} = require('discord.js');

const COLORS = ['Red', 'Blue', 'Green', 'Yellow'];
const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', '+2'];
const WILDS = ['Wild', 'Wild +4'];
const EMOJIS = {
    'Red': '🟥', 'Blue': '🟦', 'Green': '🟩', 'Yellow': '🟨', 'Wild': '🌈',
    'Skip': '🚫', 'Reverse': '🔁', '+2': 'aa', '+4': 'aaaa' // Using text for +2/+4 if no custom emoji
};

module.exports = {
    name: 'uno',
    description: 'Play a game of UNO',
    perms: 3, // Everyone
    data: new SlashCommandBuilder()
        .setName('uno')
        .setDescription('Start a game of UNO'),

    async execute(message, args) {
        await this.startLobby(message, message.author);
    },

    async executeSlash(interaction) {
        await interaction.deferReply();
        await this.startLobby(interaction, interaction.user);
    },

    async startLobby(ctx, host) {
        const gameId = Date.now().toString().slice(-4);
        const players = [host];
        let started = false;

        const getLobbyEmbed = () => new EmbedBuilder()
            .setTitle(`UNO Lobby (ID: ${gameId})`)
            .setDescription(`**Host:** ${host}\n\n**Players (${players.length}):**\n${players.map(p => `• ${p.username}`).join('\n')}`)
            .setColor('Random')
            .setFooter({ text: 'Min 2 players to start' });

        const getLobbyComponents = (active = true) => [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`uno_join_${gameId}`).setLabel('Join').setStyle(ButtonStyle.Success).setDisabled(!active),
                new ButtonBuilder().setCustomId(`uno_leave_${gameId}`).setLabel('Leave').setStyle(ButtonStyle.Danger).setDisabled(!active),
                new ButtonBuilder().setCustomId(`uno_start_${gameId}`).setLabel('Start Game').setStyle(ButtonStyle.Primary).setDisabled(!active || players.length < 2)
            )
        ];

        let msg;
        if (ctx.commandName === 'uno' || ctx.deferred) {
            msg = await ctx.editReply({ embeds: [getLobbyEmbed()], components: getLobbyComponents() });
        } else {
            msg = await ctx.reply({ embeds: [getLobbyEmbed()], components: getLobbyComponents() });
        }
        if (ctx.commandName) msg = await ctx.fetchReply();

        const collector = msg.channel.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 
        });

        collector.on('collect', async i => {
            if (!i.customId.includes(gameId)) return;

            try {
                if (i.customId === `uno_join_${gameId}`) {
                    if (players.find(p => p.id === i.user.id)) {
                        await i.reply({ content: 'You are already in the lobby.', ephemeral: true });
                    } else {
                        players.push(i.user);
                        await i.update({ embeds: [getLobbyEmbed()], components: getLobbyComponents() });
                    }
                } else if (i.customId === `uno_leave_${gameId}`) {
                    const idx = players.findIndex(p => p.id === i.user.id);
                    if (idx !== -1) {
                        players.splice(idx, 1);
                        // If host leaves, assign new host or close?
                        if (players.length === 0) {
                            collector.stop('empty');
                            await i.update({ content: 'Lobby closed.', components: [] });
                            return;
                        }
                        await i.update({ embeds: [getLobbyEmbed()], components: getLobbyComponents() });
                    } else {
                        await i.reply({ content: 'You are not in the lobby.', ephemeral: true });
                    }
                } else if (i.customId === `uno_start_${gameId}`) {
                    if (i.user.id !== players[0].id) {
                        return i.reply({ content: 'Only the host can start the game.', ephemeral: true });
                    }
                    if (players.length < 2) {
                        return i.reply({ content: 'Need at least 2 players.', ephemeral: true });
                    }
                    started = true;
                    collector.stop('started');
                    await i.update({ content: 'Starting game...', components: [] });
                    this.runGame(msg, players);
                }
            } catch (e) {
                console.error(e);
            }
        });

        collector.on('end', (_, reason) => {
            if (reason !== 'started' && !started) {
                msg.edit({ content: 'UNO Lobby timed out.', components: [] }).catch(() => {});
            }
        });
    },

    async runGame(message, players) {
        // --- Game State ---
        let deck = this.createDeck();
        let discardPile = [deck.pop()];
        // Ensure starting card is not Wild +4
        while (discardPile[0].value === 'Wild +4') {
            deck.unshift(discardPile.pop());
            this.shuffle(deck);
            discardPile.push(deck.pop());
        }

        const hands = {};
        players.forEach(p => {
            hands[p.id] = deck.splice(0, 7);
        });

        let turnIndex = 0;
        let direction = 1; // 1 or -1
        let currentColor = discardPile[0].color === 'Wild' ? COLORS[Math.floor(Math.random() * 4)] : discardPile[0].color;
        let winner = null;

        // --- Helper Functions ---
        const getCardString = (card) => {
            if (card.color === 'Wild') return `${EMOJIS[card.color]} ${card.value}`;
            return `${EMOJIS[card.color]} ${card.color} ${card.value}`;
        };

        const getGameEmbed = () => {
            const currentP = players[turnIndex];
            const top = discardPile[discardPile.length - 1];
            
            let description = `**Top Card:** ${getCardString(top)}\n`;
            if (top.color === 'Wild') description += `**Current Color:** ${EMOJIS[currentColor]} ${currentColor}\n`;
            
            description += `\n**Turn:** ${currentP} (${hands[currentP.id].length} cards)\n`;
            description += `Direction: ${direction === 1 ? '⬇️' : '⬆️'}\n\n`;

            players.forEach((p, i) => {
                const indicator = i === turnIndex ? '👉' : (winner && winner.id === p.id ? '🏆' : ' ');
                description += `${indicator} **${p.username}**: ${hands[p.id].length} cards\n`;
            });

            return new EmbedBuilder()
                .setTitle('UNO Game')
                .setDescription(description)
                .setColor(currentColor === 'Red' ? 'Red' : currentColor === 'Blue' ? 'Blue' : currentColor === 'Green' ? 'Green' : currentColor === 'Yellow' ? 'Gold' : 'Grey');
        };

        const getGameComponents = () => {
             const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('uno_view_hand').setLabel('View Hand').setStyle(ButtonStyle.Secondary).setEmoji('🃏'),
                    new ButtonBuilder().setCustomId('uno_draw').setLabel('Draw Card').setStyle(ButtonStyle.Primary).setEmoji('📥')
             );
             return [row];
        };

        // Send Initial Game Message
        let gameMsg = await message.channel.send({ embeds: [getGameEmbed()], components: getGameComponents() });

        const collector = gameMsg.channel.createMessageComponentCollector({ 
            filter: i => i.message.id === gameMsg.id && ['uno_view_hand', 'uno_draw'].includes(i.customId),
            time: 15 * 60 * 1000 
        });

        // Loop helpers
        const updateGameMsg = async () => {
            if (winner) {
                collector.stop();
                await gameMsg.edit({ content: `🏆 **${winner.username}** WON UNO!`, embeds: [getGameEmbed()], components: [] });
            } else {
                await gameMsg.edit({ embeds: [getGameEmbed()], components: getGameComponents() });
            }
        };

        const drawCards = (pid, count) => {
            for (let i = 0; i < count; i++) {
                if (deck.length === 0) {
                    if (discardPile.length > 1) {
                         const top = discardPile.pop();
                         deck = this.shuffle(discardPile);
                         discardPile = [top];
                    } else {
                        break; // No cards left
                    }
                }
                hands[pid].push(deck.pop());
            }
        };

        const nextTurn = (skip = false) => {
            turnIndex = (turnIndex + (direction * (skip ? 2 : 1))) % players.length;
            if (turnIndex < 0) turnIndex += players.length;
        };

        // --- Collector Logic ---
        collector.on('collect', async i => {
            if (!players.find(p => p.id === i.user.id)) return i.reply({ content: "Not in game", ephemeral: true });

            const pid = i.user.id;
            const isTurn = players[turnIndex].id === pid;

            // --- DRAW ---
            if (i.customId === 'uno_draw') {
                if (!isTurn) return i.reply({ content: "Not your turn!", ephemeral: true });
                
                drawCards(pid, 1);
                const drawn = hands[pid][hands[pid].length - 1]; // peek
                
                // Optional: Allow playing drawn card immediately if valid?
                // For simplicity, just add to hand and end turn.
                nextTurn();
                await updateGameMsg();
                await i.reply({ content: `You drew a ${getCardString(drawn)}. Turn passed.`, ephemeral: true });
                return;
            }

            // --- VIEW HAND ---
            if (i.customId === 'uno_view_hand') {
                const myHand = hands[pid];
                // Sort hand by color/value
                myHand.sort((a, b) => (a.color > b.color) ? 1 : ((a.color < b.color) ? -1 : (a.value > b.value ? 1 : -1)));

                const options = myHand.map((card, idx) => ({
                    label: `${card.color} ${card.value}`,
                    value: idx.toString(),
                    description: card.color === 'Wild' ? 'Choose Color' : undefined,
                    emoji: EMOJIS[card.color] || '🃏'
                })).slice(0, 25);

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('uno_hand_select')
                        .setPlaceholder('Select a card to play')
                        .addOptions(options)
                        .setDisabled(!isTurn) // Can only select if turn
                );

                const handMsg = await i.reply({ content: isTurn ? "Your turn! Pick a card:" : "Your hand (Wait for your turn):", components: [row], ephemeral: true, fetchReply: true });
                
                if (!isTurn) return; // Just viewing

                // Wait for selection
                try {
                    const selection = await handMsg.awaitMessageComponent({ componentType: ComponentType.StringSelect, time: 60000 });
                    
                    const cardIdx = parseInt(selection.values[0]);
                    const card = myHand[cardIdx];
                    const top = discardPile[discardPile.length - 1];

                    // Validate Move
                    let valid = false;
                    if (card.color === 'Wild') valid = true;
                    else if (card.color === currentColor) valid = true;
                    else if (card.value === top.value) valid = true;

                    if (!valid) {
                        return selection.update({ content: `❌ Invalid Move! You must match **${currentColor}** or **${top.value}**.`, components: [] });
                    }

                    // Handle Wild Color Choice
                    let chosenColor = card.color;
                    if (card.color === 'Wild') {
                         const colorRow = new ActionRowBuilder().addComponents(
                             COLORS.map(c => new ButtonBuilder().setCustomId(`color_${c}`).setLabel(c).setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS[c]))
                         );
                         const colorMsg = await selection.update({ content: "Choose a color:", components: [colorRow], fetchReply: true });
                         try {
                             const colorSel = await colorMsg.awaitMessageComponent({ componentType: ComponentType.Button, time: 30000 });
                             chosenColor = colorSel.customId.split('_')[1];
                             // Defer execution to outside block to keep code dry? No, proceed here.
                             // We have to commit the move here.
                         } catch(e) {
                             return selection.editReply({ content: "Timed out picking color.", components: [] });
                         }
                    } else {
                        await selection.deferUpdate();
                    }

                    // --- EXECUTE MOVE ---
                    hands[pid].splice(cardIdx, 1); // remove card
                    discardPile.push(card);
                    currentColor = (card.color === 'Wild') ? chosenColor : card.color;

                    let skipTurn = false;
                    
                    // Card Effects
                    if (card.value === 'Skip') skipTurn = true;
                    if (card.value === 'Reverse') {
                         direction *= -1;
                         if (players.length === 2) skipTurn = true; 
                    }
                    if (card.value === '+2') {
                        // Next player draws 2 AND Skip
                        const nextPIndex = (turnIndex + direction) % players.length;
                        const targetP = players[nextPIndex < 0 ? nextPIndex + players.length : nextPIndex];
                        drawCards(targetP.id, 2);
                        skipTurn = true;
                    }
                    if (card.value === 'Wild +4') {
                        const nextPIndex = (turnIndex + direction) % players.length;
                        const targetP = players[nextPIndex < 0 ? nextPIndex + players.length : nextPIndex];
                        drawCards(targetP.id, 4);
                        skipTurn = true;
                    }

                    // Check Win
                    if (hands[pid].length === 0) {
                        winner = players.find(p => p.id === pid);
                    } else {
                        nextTurn(skipTurn);
                    }
                    
                    await updateGameMsg();
                    await i.editReply({ content: `Played ${getCardString(card)}!`, components: [] });

                } catch (e) {
                    // Ignore timeouts
                }
            }
        });
    },
    
    // --- Methods for Logic ---
    createDeck() {
        const deck = [];
        COLORS.forEach(c => {
            deck.push({ color: c, value: '0' });
            for (let i = 0; i < 2; i++) {
                 for (let v = 1; v <= 9; v++) deck.push({ color: c, value: v.toString() });
                 deck.push({ color: c, value: 'Skip' });
                 deck.push({ color: c, value: 'Reverse' });
                 deck.push({ color: c, value: '+2' });
            }
        });
        for (let i = 0; i < 4; i++) {
            deck.push({ color: 'Wild', value: 'Wild' });
            deck.push({ color: 'Wild', value: 'Wild +4' });
        }
        return this.shuffle(deck);
    },

    shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
        return deck;
    }
};
