const { Client, Collection, Partials } = require('discord.js');
const config = require('../config/config');

const client = new Client({
  intents: config.intents,
  partials: [Partials.Channel, Partials.Message, Partials.User]
});

// Collections for commands
client.commands = new Collection();
client.slashCommands = new Collection();

module.exports = client;

