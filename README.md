# dirar-discord-bot

A structured Discord bot built with Discord.js v14.

## Features

- ✅ Modular command system
- ✅ Event-driven architecture
- ✅ Support for both message commands and slash commands
- ✅ Organized file structure
- ✅ Easy to extend

## Available Commands

| Command | Description | Permission |
|---------|-------------|------------|
| \`adminpm\` | Send a private message to a user | Master (5) |
| \`clear\` | Deletes messages from the channel | Master (5) |
| \`clearbot\` | Deletes bot messages from the channel | Master (5) |
| \`dmallow\` | Allow a user to chat via Bot DMs | Master (5) |
| \`dmrevoke\` | Revoke DM Chat permission from a user | Master (5) |
| \`dmsetchannel\` | Set the channel where DMs will be forwarded | Master (5) |
| \`flock\` | Lock a voice channel | Master (5) |
| \`funlock\` | Unlock a voice channel | Master (5) |
| \`help\` | List all available commands | Everyone (3) |
| \`jv\` | Post the verification message | Master (5) |
| \`log\` | Log a banned user | Master (5) |
| \`logmassban\` | Log multiple banned users | Master (5) |
| \`logwarn\` | Log a warned member | Master (5) |
| \`massgrant\` | Grant a role to multiple users | Master (5) |
| \`ping\` | Replies with Pong! | Everyone (3) |
| \`roastme\` | Test the roast system | Impossible (10) |
| \`tictactoe\` | Play a game of Tic-Tac-Toe | Everyone (3) |

## Project Structure

```
dirar-discord-bot/
├── src/
│   ├── client/          # Client configuration
│   │   └── client.js
│   ├── commands/        # Message commands
│   │   └── ping.js
│   ├── config/          # Configuration files
│   │   ├── config.js
│   │   └── env.js
│   ├── events/          # Event handlers
│   │   ├── ready.js
│   │   ├── messageCreate.js
│   │   └── interactionCreate.js
│   ├── handlers/        # Dynamic loaders
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   └── index.js         # Entry point
├── .env                 # Environment variables (create this)
├── .env.example         # Example environment variables
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Discord Bot Token
# Get your token from https://discord.com/developers/applications
TOKEN=your_bot_token_here

# Bot Prefix (for message commands)
PREFIX=!

# Client ID (optional, for slash commands - auto-detected if not set)
CLIENT_ID=your_client_id_here

# Guild ID (optional, for testing slash commands in a specific server)
GUILD_ID=your_guild_id_here

# Owner ID (CHRIS - gets perms 8, full access)
# Enable Developer Mode in Discord, right-click user → Copy ID
OWNER_ID=your_discord_user_id_here

# Master IDs (comma-separated list of user IDs that get perms 5)
# Example: MASTER_IDS=123456789,987654321
MASTER_IDS=user_id_1,user_id_2
```

### 3. Get Your Bot Token

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select an existing one
3. Go to the "Bot" section
4. Click "Reset Token" or "Copy" to get your bot token
5. Paste it in your `.env` file as `TOKEN=your_token_here`

### 4. Invite Your Bot to a Server

1. In the Discord Developer Portal, go to "OAuth2" > "URL Generator"
2. Select the following scopes:
   - `bot`
   - `applications.commands` (for slash commands)
3. Select the following bot permissions:
   - Send Messages
   - Read Message History
   - Use Slash Commands
4. Copy the generated URL and open it in your browser
5. Select a server and authorize the bot

### 5. Run the Bot

```bash
npm start
```

Or for development:

```bash
npm run dev
```

## Creating Commands

You can create **both message commands and slash commands in the same file**! This makes it easy to support both command types.

### Message Command Only

```javascript
module.exports = {
  name: 'commandname',
  description: 'Command description',
  execute(message, args) {
    // Your command logic here
    message.reply('Hello!');
  }
};
```

### Slash Command Only

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('commandname')
    .setDescription('Command description'),
  
  async executeSlash(interaction) {
    await interaction.reply('Hello!');
  }
};
```

### Both in the Same File (Recommended)

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  // Message command properties
  name: 'ping',
  description: 'Replies with Pong!',
  
  // Slash command data (optional)
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  
  // Message command handler
  execute(message, args) {
    message.reply('🏓 Pong!');
  },
  
  // Slash command handler (optional)
  async executeSlash(interaction) {
    await interaction.reply('🏓 Pong!');
  }
};
```

### Registering Slash Commands

After creating slash commands, you need to register them with Discord:

```bash
npm run deploy-commands
```

**Note:** 
- `CLIENT_ID` is optional - the script will auto-detect it from your bot token if not set
- `GUILD_ID` is optional - if set, commands register to that guild (faster for testing). If not set, commands register globally (takes up to 1 hour to appear)

### Permission System

The bot has a 3-tier permission system:

- **Perms 8 (Owner)**: CHRIS (OWNER_ID) - Full access to all commands
- **Perms 5 (Master)**: Users listed in MASTER_IDS - Access to master-level commands
- **Perms 3 (Regular)**: All other users - Access to regular commands

To set permissions on a command, add the `perms` property:

```javascript
module.exports = {
  name: 'admin',
  perms: 8, // Only owner (CHRIS) can use
  // ...
};

module.exports = {
  name: 'mod',
  perms: 5, // Masters and owner can use
  // ...
};

module.exports = {
  name: 'public',
  perms: 3, // Everyone can use (default if not specified)
  // ...
};
```

**Getting User IDs:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click on a user → Copy ID

## Current Commands

- `!ping` or `/ping` - Replies with Pong! 🏓 (Perms: 3 - Everyone)
- `!clearbot <amount>` or `/clearbot amount:<number>` - Deletes bot messages from the channel (Perms: 5 - Masters)

## Troubleshooting

### "Unknown Application" Error

If you get `DiscordAPIError[10002]: Unknown Application` when deploying commands:

1. **Remove CLIENT_ID from .env** - Let the script auto-detect it from your bot token
2. **Verify your TOKEN** - Make sure it's correct in your `.env` file
3. **Check guild access** - If using `GUILD_ID`, make sure the bot is in that server

The script will now automatically fetch your application ID if `CLIENT_ID` is not set.

### Bot Not Responding

- Make sure the bot is online (check console for "✅ Logged in as...")
- Verify the bot has proper permissions in the server
- For message commands, check that your `PREFIX` matches what you're typing
- For slash commands, make sure you ran `npm run deploy-commands` after creating them

## Requirements

- Node.js 16.9.0 or higher
- Discord.js v14
- A Discord bot token

## License

ISC
