// Standalone script to deploy slash commands
// Run with: node src/utils/deployCommands.js

require('dotenv').config();
const registerCommands = require('./registerCommands');

registerCommands()
  .then(() => {
    console.log('✅ Command registration complete!');
    // Allow the process to exit naturally
  })
  .catch((error) => {
    console.error('❌ Failed to register commands:', error);
    process.exit(1);
  });

