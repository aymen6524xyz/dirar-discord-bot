const { Client, Collection } = require('discord.js');
const config = require('../config/config');

const client = new Client({
  intents: config.intents,
});

// Collections for commands
client.commands = new Collection();
client.slashCommands = new Collection();

module.exports = client;

