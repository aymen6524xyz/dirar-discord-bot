const fs = require("fs");
const path = require("path");
const client = require("../client/client");

module.exports = () => {
  const eventsPath = path.join(__dirname, "../events");
  if (fs.existsSync(eventsPath)) {
    const eventFiles = fs
      .readdirSync(eventsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      loadEvent(filePath);
    }
  }
};

function loadEvent(filePath) {
  try {
    const event = require(filePath);

    const execute = async (...args) => {
      try {
        await event.execute(...args);
      } catch (error) {
        console.error(`❌ Error in event ${event.name}:`, error);
      }
    };

    if (event.once) {
      client.once(event.name, execute);
    } else {
      client.on(event.name, execute);
    }

    console.log(
      `✅ Loaded event: ${event.name} from ${path.basename(filePath)}`,
    );
  } catch (error) {
    console.error(`❌ Failed to load event from ${filePath}:`, error);
  }
}
