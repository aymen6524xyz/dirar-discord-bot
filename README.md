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
| `connect`     | Connects the bot to a voice channel muted and deafened. |
| `flock`       | Locks a voice channel (Restricts @everyone).             |
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
| `reply`           | Reply in the target channel to a forwarded DM (supports specific ID or "last"). |
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

### 🎵 Music (Everyone - Level 3)

| Command | Description |
| ------- | ----------- |
| `play <URL or search>` | Join your voice channel and play or queue a YouTube track. |
| `skip` | Skip the current track. |
| `stop` | Stop playback, clear the queue, and disconnect. |
| `queue` | Show the currently playing track and queued tracks. |

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
│   ├── music/            # Guild music queues and voice playback
│   │   └── musicManager.js
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

Music playback uses `play-dl` for YouTube extraction and bundles FFmpeg through
`ffmpeg-static`. The bot needs **Connect** and **Speak** permissions in the
voice channel. YouTube playback may require a current
`play-dl` installation when YouTube changes its streaming API.

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

## Privacy Policy Website

The repository root also contains a dependency-free, GitHub Pages-ready privacy
policy website for Colonel Hans:

- `index.html` — policy page and table of contents.
- `style.css` — responsive, accessible, dark-theme styling and print rules.
- `script.js` — small progressive-enhancement script.
- `404.html` — fallback page for GitHub Pages.

The policy contains bracketed placeholders that **must be reviewed and replaced
before publication**, including the operator identity, contact details, dates,
support-server link, retention decisions, and confirmation of any optional
external services. The policy is based on the source code reviewed in this
repository and is not legal advice.

### GitHub Pages deployment

1. Create a **public** GitHub repository for the website.
2. Upload `index.html`, `style.css`, `script.js`, `404.html`, and this
   `README.md` to the repository root. Do not upload `.env`, bot tokens, API
   keys, or database credentials.
3. Open **Settings → Pages**.
4. Under the build and deployment settings, select **Deploy from a branch**.
5. Choose the `main` branch and the `/ (root)` directory.
6. Select **Save**, then wait for GitHub Pages to publish the site.
7. Open the published URL and verify every section, table-of-contents link,
   contact link, 404 page, print layout, and mobile layout.
8. Enter the published Privacy Policy URL in the Discord Developer Portal.

Example URL format (replace the values; this is not a real URL):

`https://OWNER.github.io/REPOSITORY/`
