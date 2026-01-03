require('dotenv').config();

module.exports = {
  token: process.env.TOKEN,
  prefix: process.env.PREFIX || '!',
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  ownerId: process.env.OWNER_ID, // CHRIS's user ID
  masterIds: process.env.MASTER_IDS ? process.env.MASTER_IDS.split(',') : [], // Array of master user IDs
};

