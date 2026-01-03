const fs = require('fs');
const path = require('path');
const client = require('../client/client');

module.exports = () => {
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Load message commands (prefix commands)
    if ('name' in command && 'execute' in command) {
      client.commands.set(command.name, command);
      console.log(`✅ Loaded message command: ${command.name}`);
    }

    // Load slash commands (if they have a 'data' property)
    if ('data' in command && 'execute' in command) {
      client.slashCommands.set(command.data.name, command);
      console.log(`✅ Loaded slash command: ${command.data.name}`);
    }

    // Warn if command file doesn't have proper structure
    if (!('name' in command || 'data' in command) || !('execute' in command)) {
      console.log(`⚠️  Command ${file} is missing required properties.`);
    }
  }
};

