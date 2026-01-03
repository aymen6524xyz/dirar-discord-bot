const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config/env');

// Helper function to get application ID from token
async function getApplicationId(rest) {
  try {
    const app = await rest.get(Routes.oauth2CurrentApplication());
    return app.id;
  } catch (error) {
    throw new Error('Failed to get application ID. Make sure your TOKEN is valid.');
  }
}

module.exports = async () => {
  // Validate token
  if (!config.token) {
    console.error('❌ Error: TOKEN is not set in your .env file!');
    process.exit(1);
  }

  const commands = [];
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    // Only register slash commands (commands with 'data' property)
    if ('data' in command) {
      // Store both the command data and the enabled property
      const commandData = command.data.toJSON();
      commandData.enabled = command.enabled !== undefined ? command.enabled : true;
      commands.push(commandData);
    }
  }

  if (commands.length === 0) {
    console.log('⚠️  No slash commands found to register.');
    return;
  }

  // Construct and prepare an instance of the REST module
  const rest = new REST().setToken(config.token);

  try {
    // Get client ID - use from config or fetch from API
    let clientId = config.clientId;
    
    if (!clientId) {
      console.log('ℹ️  CLIENT_ID not set, fetching from Discord API...');
      clientId = await getApplicationId(rest);
      console.log(`✅ Found Application ID: ${clientId}`);
      console.log(`💡 Tip: Add CLIENT_ID=${clientId} to your .env file to skip this step next time.`);
    }

    // Filter commands by enabled property and remove enabled from JSON (Discord doesn't accept it)
    const enabledCommands = commands
      .filter(cmd => cmd.enabled !== false)
      .map(cmd => {
        const { enabled, ...commandData } = cmd;
        return commandData;
      });
    const disabledCount = commands.length - enabledCommands.length;
    
    if (disabledCount > 0) {
      console.log(`ℹ️  ${disabledCount} command(s) are disabled and will not be registered.`);
    }
    
    console.log(`🔄 Started refreshing ${enabledCommands.length} application (/) commands.`);

    // Register commands
    let data;
    if (config.guildId) {
      // Register to a specific guild (faster for testing)
      console.log(`📡 Registering to guild: ${config.guildId}`);
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, config.guildId),
        { body: enabledCommands },
      );
      console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
    } else {
      // Register globally (takes up to 1 hour to propagate)
      console.log('📡 Registering globally (this may take up to 1 hour to propagate)...');
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: enabledCommands },
      );
      console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
      console.log('⏰ Note: Global commands may take up to 1 hour to appear in Discord.');
    }
  } catch (error) {
    if (error.code === 10002) {
      console.error('❌ Error: Unknown Application');
      console.error('   This usually means:');
      console.error('   1. Your CLIENT_ID in .env doesn\'t match your bot\'s application ID');
      console.error('   2. The bot token is invalid or doesn\'t belong to this application');
      console.error('   3. The bot isn\'t in the specified guild (if using GUILD_ID)');
      console.error('\n💡 Solution: Remove CLIENT_ID from .env and let the script auto-detect it,');
      console.error('   or verify your CLIENT_ID matches your bot\'s application ID in Discord Developer Portal.');
    } else if (error.code === 50001) {
      console.error('❌ Error: Missing Access');
      console.error('   The bot doesn\'t have access to the specified guild.');
      console.error('   Make sure the bot is invited to the server with proper permissions.');
    } else if (error.status === 401) {
      console.error('❌ Error: Unauthorized');
      console.error('   Your bot token is invalid. Check your TOKEN in .env file.');
    } else {
      console.error('❌ Error registering commands:', error.message);
      if (error.code) console.error(`   Error code: ${error.code}`);
    }
    throw error;
  }
};

