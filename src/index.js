require("dotenv").config();
const client = require("./client/client");
const config = require("./config/env");
const commandHandler = require("./handlers/commandHandler");
const eventHandler = require("./handlers/eventHandler");

// Load commands and events
commandHandler();
eventHandler();

// Login to Discord
client.login(config.token).catch((error) => {
  console.error("❌ Failed to login:", error);
  process.exit(1);
});

// Global Error Handling
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  // Ideally, log this to a file or special channel
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  // Ideally, log this to a file or special channel
});
