const { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType, 
  EmbedBuilder 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

const activeLobbies = new Set();
let validWords = null;

const loadDictionary = () => {
    if (validWords) return;
    try {
        const filePath = path.join(__dirname, '../data/words.txt');
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            // Split by newline, trim, filter empty
            validWords = new Set(content.split(/\r?\n/).map(w => w.trim().toLowerCase()).filter(w => w.length > 0));
            console.log(`📚 Word Chain: Loaded ${validWords.size} words from local dictionary.`);
        } else {
            console.warn("⚠️ Local dictionary file not found.");
            validWords = new Set();
        }
    } catch (e) {
        console.error("❌ Failed to load dictionary:", e);
        validWords = new Set();
    }
};

module.exports = {
  name: 'wordchain',
  description: 'Play a multiplayer Word Chain game with dictionary validation',
  perms: 3,
  data: new SlashCommandBuilder()
    .setName('wordchain')
    .setDescription('Start a Word Chain game lobby'),

  async execute(message, args) {
    await this.startLobby(message, message.author);
  },

  async executeSlash(interaction) {
    if (activeLobbies.has(interaction.channelId)) {
        return interaction.reply({ content: '⚠️ A Word Chain game is already active in this channel!', ephemeral: true });
    }
    await interaction.deferReply();
    await this.startLobby(interaction, interaction.user);
  },

  async startLobby(ctx, host) {
    const channelId = ctx.channelId;
    if (activeLobbies.has(channelId)) {
         // Fallback check for message commands
         const reply = ctx.reply ? ctx.reply.bind(ctx) : ctx.editReply.bind(ctx);
         // If interaction deferred, we must edit
         return reply({ content: '⚠️ A Word Chain game is already active in this channel!' });
    }
    
    activeLobbies.add(channelId);

    // Lobby State
    const players = new Map(); // ID -> UserObj
    players.set(host.id, host);

    const getLobbyEmbed = () => {
      const playerList = Array.from(players.values()).map(p => `• ${p.username}`).join('\n');
      return new EmbedBuilder()
        .setTitle('🔗 Word Chain - Lobby')
        .setDescription(`**Host:** ${host.username}\n\n**Instructions:**\n• Take turns typing a valid English word.\n• Your word must start with the **last letter** of the previous word.\n• Minimum 3 letters.\n• No duplicates.\n• You have 2 lives and 15 seconds per turn.\n\n**Players:**\n${playerList}\n\nMinimum 2 players required to start.`)
        .setColor('Green')
        .setFooter({ text: 'Waiting for players...' });
    };

    const getLobbyButtons = (started = false) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('wc_join').setLabel('Join').setStyle(ButtonStyle.Success).setDisabled(started),
        new ButtonBuilder().setCustomId('wc_leave').setLabel('Leave').setStyle(ButtonStyle.Danger).setDisabled(started),
        new ButtonBuilder()
            .setCustomId('wc_start')
            .setLabel('Start Game')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(started || players.size < 2)
      );
    };

    // Send Lobby
    let message;
    if (ctx.commandName) {
         message = await ctx.editReply({ embeds: [getLobbyEmbed()], components: [getLobbyButtons()] });
    } else {
         message = await ctx.reply({ embeds: [getLobbyEmbed()], components: [getLobbyButtons()] });
    }

    // Lobby Collector
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 mins lobby timeout
    });

    collector.on('collect', async i => {
        if (i.customId === 'wc_join') {
            if (players.has(i.user.id)) return i.reply({ content: 'You are already in!', ephemeral: true });
            players.set(i.user.id, i.user);
            await i.update({ embeds: [getLobbyEmbed()], components: [getLobbyButtons()] });
        }
        else if (i.customId === 'wc_leave') {
            if (i.user.id === host.id) return i.reply({ content: 'Host cannot leave. Cancel the game instead.', ephemeral: true });
            if (!players.has(i.user.id)) return i.reply({ content: 'You are not in the lobby!', ephemeral: true });
            players.delete(i.user.id);
            await i.update({ embeds: [getLobbyEmbed()], components: [getLobbyButtons()] });
        }
        else if (i.customId === 'wc_start') {
            if (i.user.id !== host.id) return i.reply({ content: 'Only the host can start the game.', ephemeral: true });
            if (players.size < 2) return i.reply({ content: 'Need at least 2 players!', ephemeral: true });
            
            collector.stop('started');
            await i.update({ components: [getLobbyButtons(true)] });
            // START GAME
            this.runGame(message, Array.from(players.values()));
        }
    });

    collector.on('end', (collected, reason) => {
        if (reason !== 'started') {
            activeLobbies.delete(channelId);
            const timeoutEmbed = new EmbedBuilder().setTitle('Word Chain').setDescription('Lobby timed out.').setColor('Grey');
            message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
    });
  },

  async runGame(message, playerList) {
    const channelId = message.channel.id;
    // Game State
    let players = playerList.map(p => ({
        user: p,
        lives: 2,
        alive: true
    }));
    // Randomize order
    players = players.sort(() => Math.random() - 0.5);

    let chain = [];
    const usedWords = new Set();
    let turnIndex = 0;
    let round = 1;

    // Helper to get alive players
    const getAlive = () => players.filter(p => p.alive);
    
    // Main Loop Function
    const nextTurn = async () => {
        // Check Win Condition
        const alive = getAlive();
        if (alive.length === 1) {
            activeLobbies.delete(channelId);
            const winEmbed = new EmbedBuilder()
                .setTitle('🏆 Word Chain Champion!')
                .setDescription(`**${alive[0].user.username}** is the last one standing!\n\n**Chain Length:** ${chain.length} words`)
                .setColor('Gold');
            return message.channel.send({ embeds: [winEmbed] });
        }
        if (alive.length === 0) {
            activeLobbies.delete(channelId);
            return message.channel.send("Game Over. Everyone died?!");
        }

        // Get Current Player (skip dead)
        while (!players[turnIndex].alive) {
            turnIndex = (turnIndex + 1) % players.length;
        }
        const currentPlayer = players[turnIndex];
        const requiredChar = chain.length > 0 ? chain[chain.length-1].slice(-1).toUpperCase() : null; // Use 'Any' if empty

        // Build UI
        const chainDisplay = chain.slice(-5).join(' ➡️ '); // Show last 5
        const history = chain.length > 5 ? `... ${chainDisplay}` : (chain.length > 0 ? chainDisplay : '*(Start the chain!)*');
        
        const turnEmbed = new EmbedBuilder()
            .setTitle(`🔗 Word Chain - Round ${round}`)
            .setDescription(`**Turn:** <@${currentPlayer.user.id}>\n**Lives:** ${'❤️'.repeat(currentPlayer.lives)}\n\n**Required Start:** ${requiredChar ? `**${requiredChar}**` : 'Any Letter'}\n**Chain:** ${history}`)
            .setColor('Blue')
            .setFooter({ text: 'You have 15 seconds to type a word!' });

        const turnMsg = await message.channel.send({ content: `<@${currentPlayer.user.id}>`, embeds: [turnEmbed] });

        // Await Message
        const filter = m => m.author.id === currentPlayer.user.id && !m.author.bot;
        
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 15000, errors: ['time'] });
            const wordMsg = collected.first();
            const word = wordMsg.content.trim().toLowerCase();

            // VALIDATION
            let error = null;

            // 1. Basic Chars
            if (!/^[a-zA-Z]+$/.test(word)) error = "Word must only contain letters.";
            
            // 2. Length
            else if (word.length < 3) error = "Word is too short (min 3 letters).";

            // 3. Start Char
            else if (requiredChar && word[0].toUpperCase() !== requiredChar) error = `Word must start with **${requiredChar}**!`;

            // 4. Used
            else if (usedWords.has(word)) error = "Word already used!";
            
            // 5. Dictionary Check (Async)
            else {
                const isValid = await this.checkDictionary(word);
                if (!isValid) error = "Not a valid English word!";
            }

            if (error) {
                // Punishment
                await wordMsg.react('❌').catch(() => {});
                currentPlayer.lives--;
                
                let punishMsg = `❌ **${error}**\nYou lost a heart! ❤️ (${currentPlayer.lives} remaining)`;
                if (currentPlayer.lives <= 0) {
                    currentPlayer.alive = false;
                    punishMsg += "\n💀 **ELIMINATED!**";
                }

                await message.channel.send(punishMsg).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
            } else {
                // Success
                await wordMsg.react('✅').catch(() => {});
                chain.push(word);
                usedWords.add(word);
                await turnMsg.delete().catch(()=>{}); // Delete old prompt for cleaner feed
            }

            // Next Turn
            turnIndex = (turnIndex + 1) % players.length;
            if (turnIndex === 0) round++;
            nextTurn();

        } catch (e) {
            // Time out
            currentPlayer.lives--;
            let punishMsg = `⏰ **Time's up!**\nYou lost a heart! ❤️ (${currentPlayer.lives} remaining)`;
            if (currentPlayer.lives <= 0) {
                currentPlayer.alive = false;
                punishMsg += "\n💀 **ELIMINATED!**";
            }
            
            await message.channel.send(punishMsg).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
            
            turnIndex = (turnIndex + 1) % players.length;
            if (turnIndex === 0) round++;
            nextTurn();
        }
    };

    // Begin
    nextTurn();
  },

  async checkDictionary(word) {
    if (!validWords) loadDictionary();
    
    const w = word.toLowerCase();

    // 1. Check Local Dictionary (Fast)
    if (validWords && validWords.has(w)) return true;

    // 2. Check Online API (Expanded Corpus)
    // allowing "more more more more words" that aren't in the local file
    try {
        // Use global fetch (Node 18+)
        const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${w}`);
        if (res.ok) {
            // Cache valid word to avoid future API calls
            if (validWords) validWords.add(w);
            return true;
        }
    } catch (e) {
        // Ignore API errors, fallback to false
    }

    // If local dictionary is completely missing, default to true (allow all) to prevent softlock
    if (!validWords || validWords.size === 0) {
        return true;
    }
    
    return false;
  }
};
