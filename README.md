# dirar-discord-bot

A structured and feature-rich Discord bot built with Discord.js v14.

## Features

- ✅ **Modular Command System**: Easy to scale and maintain.
- ✅ **Event-Driven Architecture**: Clean interactions handling.
- ✅ **Hybrid Command Support**: Works with both prefix-based messages and Slash Commands.
- ✅ **Advanced Moderation**: Tools for logging, banning, voice channel management, and specialized DM handling.
- ✅ **Fun & Games**: Includes Tic-Tac-Toe, Minesweeper, Uno, Word Chain, and more.
- ✅ **AI Integration**: Powered by Google Gemini and OpenRouter/OpenAI.
- ✅ **Log System**: Comprehensive logging for warnings, bans, and mass bans.
- ✅ **Permission Levels**: Granular control with Everyone (3), Master (5), and Owner (8) tiers.

## Available Commands

### 🛡️ Moderation & Administration (Master - Level 5)

| Command      | Description                                              |
| ------------ | -------------------------------------------------------- |
| `adminpm`    | Send a private message to a user as the bot.             |
| `clear`      | Deletes a specified amount of messages from the channel. |
| `clearbot`   | Deletes only the bot's messages from the channel.        |
| `flock`      | Locks a voice channel (Restricts @everyone).             |
| `funlock`    | Unlocks a voice channel.                                 |
| `jv`         | Posts the server verification message.                   |
| `log`        | Log a user ban with a reason.                            |
| `logmassban` | Log bans for multiple users at once.                     |
| `logwarn`    | Log a warning for a member.                              |
| `massgrant`  | Grant a specific role to multiple users.                 |

### 👑 Owner / High Level (Owner - Level 8)

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `addmaster`       | Promote a user to Master (Level 5).                       |
| `revokemaster`    | Demote a user from Master.                                |
| `blacklist`       | Block a user from using the bot completely.               |
| `unblacklist`     | Unblock a user.                                           |
| `dmallow`         | Allow a specific user to chat via Bot DMs.                |
| `dmrevoke`        | Revoke DM chat permission from a user.                    |
| `dmsetchannel`    | Set the channel where received DMs are forwarded.         |
| `reply`           | Reply to a forwarded DM (supports specific ID or "last"). |
| `verificationtop` | View admin verification stats for the last 7 days.        |

### 🎮 Fun & Utilities (Everyone - Level 3)

| Command       | Description                                     |
| ------------- | ----------------------------------------------- |
| `8ball`       | Ask the magic 8-ball a question.                |
| `help`        | List all available commands or get info on one. |
| `memory`      | Play a game of Memory (Match the Pairs).        |
| `minesweeper` | Play a game of Interactive Minesweeper.         |
| `ping`        | Checks bot latency (Pong!).                     |
| `roastme`     | Roast a user with Algerian flavor 🇩🇿.           |
| `rps`         | Play Rock Paper Scissors against the bot.       |
| `ship`        | Calculate a match percentage between two users. |
| `status`      | Check the status/rank of a member.              |
| `tictactoe`   | Play Tic-Tac-Toe against the bot or a friend.   |
| `uno`         | Play a game of UNO.                             |
| `wordchain`   | Participate in the Word Chain game.             |

## Project Structure

```
dirar-discord-bot/
├── src/
│   ├── client/          # Client initialization
│   │   └── client.js
│   ├── commands/        # Command files (Slash & Message)
│   │   ├── 8ball.js
│   │   ├── ... (and high-level admin commands)
│   │   └── wordchain.js
│   ├── config/          # Configuration files
│   │   ├── config.js
│   │   ├── env.js
│   │   └── ...
│   ├── data/            # JSON data & text assets
│   │   ├── dm_replies.json
│   │   ├── roasts.json
│   │   └── words.txt
│   ├── events/          # Event listeners
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   └── ready.js
│   ├── handlers/        # Dynamic command & event loaders
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── utils/           # Utility functions & managers
│   │   ├── blacklistManager.js
│   │   ├── deployCommands.js
│   │   ├── masterManager.js
│   │   ├── permissions.js
│   │   └── ...
│   └── index.js         # Entry point
├── .env                 # Environment variables
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your keys:

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

# Owner ID (Gets full access - Level 8)
# Enable Developer Mode in Discord, right-click user → Copy ID
OWNER_ID=your_discord_user_id_here,secondary_owner_id

# Master IDs (Comma-separated list of Level 5 admins)
MASTER_IDS=user_id_1,user_id_2

# AI API Keys
GEMINI_API_KEY=your_gemini_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
```

### 3. Deploy Slash Commands

If you add new slash commands, run this script to register them with Discord:

```bash
npm run deploy-commands
```

### 4. Run the Bot

Start the bot in development mode:

```bash
npm run dev
```

Or for production:

```bash
npm start
```
