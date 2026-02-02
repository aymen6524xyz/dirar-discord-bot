const fs = require("fs");
const path = require("path");
const client = require("../client/client");

module.exports = () => {
  const commandsPath = path.join(__dirname, "../commands");

  // Function to recursively get all files
  const getFilesRecursively = (dir) => {
    // Check if directory exists
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir, { withFileTypes: true });
    let commandFiles = [];

    for (const file of files) {
      if (file.isDirectory()) {
        commandFiles = [
          ...commandFiles,
          ...getFilesRecursively(path.join(dir, file.name)),
        ];
      } else if (file.name.endsWith(".js")) {
        commandFiles.push(path.join(dir, file.name));
      }
    }
    return commandFiles;
  };

  const commandFiles = getFilesRecursively(commandsPath);

  for (const filePath of commandFiles) {
    const command = require(filePath);
    const fileName = path.basename(filePath);

    // Load message commands (prefix commands)
    if ("name" in command && "execute" in command) {
      client.commands.set(command.name, command);
      console.log(`✅ Loaded message command: ${command.name}`);
    }

    // Load slash commands (if they have a 'data' property)
    if ("data" in command && "execute" in command) {
      // If executeSlash is present, use it for slash interactions, otherwise execute is used (handled in interactionCreate)
      client.slashCommands.set(command.data.name, command);
      console.log(`✅ Loaded slash command: ${command.data.name}`);
    }

    // Warn if command file doesn't have proper structure
    if (!("name" in command || "data" in command) || !("execute" in command)) {
      // Only warn if it's not a logic file (check if it exports a class or function directly might be hard, just ignore warning for now)
      // console.log(`⚠️  Command ${fileName} is missing required properties.`);
    }
  }
};
