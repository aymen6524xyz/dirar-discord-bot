require('dotenv').config();

module.exports = {
  token: process.env.TOKEN,
  prefix: process.env.PREFIX || '!',
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerIds: process.env.OWNER_ID ? process.env.OWNER_ID.split(',').map(id => id.trim()) : [], // CHRIS's user ID (now supports multiple as CSV)
  masterIds: process.env.MASTER_IDS ? process.env.MASTER_IDS.split(',').map(id => id.trim()) : [], // Array of master user IDs
  geminiKey: process.env.GEMINI_API_KEY,
  openRouterKey: process.env.OPENROUTER_API_KEY,
};

