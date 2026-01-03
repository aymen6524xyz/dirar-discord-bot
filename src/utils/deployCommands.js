// Standalone script to deploy slash commands
// Run with: node src/utils/deployCommands.js

require('dotenv').config();
const registerCommands = require('./registerCommands');

registerCommands()
  .then(() => {
    console.log('✅ Command registration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  });

