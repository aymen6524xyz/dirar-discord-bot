const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getUserPerms } = require("../utils/permissions");
const { getCommandRequiredPerms } = require("../utils/commandPermsManager");

module.exports = {
  name: "help",
  description:
    "List all available commands or get info about a specific command",
  perms: 3, // Everyone can use help
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("List all available commands")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command to get specific info about")
        .setRequired(false),
    ),

  async execute(message, args) {
    const commandName = args[0];
    if (commandName) {
      // Show specific command info
      await this.showCommandInfo(message, commandName);
    } else {
      // Show all commands
      await this.showAllCommands(message);
    }
  },

  async executeSlash(interaction) {
    const commandName = interaction.options.getString("command");
    if (commandName) {
      await interaction.deferReply();
      await this.showCommandInfo(interaction, commandName, true);
    } else {
      await interaction.deferReply();
      await this.showAllCommands(interaction, true);
    }
  },

  async showAllCommands(ctx, isSlash = false) {
    const { client } = ctx;
    const user = isSlash ? ctx.user : ctx.author;
    const userPerms = getUserPerms(user.id);

    // Get all unique commands (preferring slash commands data if available, or just the command object)
    // We use the 'commands' collection which contains both slash and message commands loaded
    const commands = client.commands; // Assuming client.commands contains all commands

    // Group commands by permission level
    const publicCommands = [];
    const modCommands = []; // Level 5
    const agrAdminCommands = []; // Level 7
    const adminCommands = []; // Level 8

    commands.forEach((cmd) => {
      // Check permissions (dynamic or static)
      const requiredPerms = getCommandRequiredPerms(cmd.name, cmd.perms || 3);

      // Skip if user doesn't have permission to see it
      if (userPerms < requiredPerms) return;

      const cmdInfo = `\`d?${cmd.name}\` - ${cmd.description}`;

      if (requiredPerms >= 8) {
        adminCommands.push(cmdInfo);
      } else if (requiredPerms === 7) {
        agrAdminCommands.push(cmdInfo);
      } else if (requiredPerms >= 5) {
        modCommands.push(cmdInfo);
      } else {
        publicCommands.push(cmdInfo);
      }
    });

    const embed = new EmbedBuilder()
      .setTitle("📜 Available Commands")
      .setColor(0x0099ff)
      .setDescription(
        `Here are the commands available for your permission level (**Level ${userPerms}**)`,
      )
      .setFooter({ text: "Use d?help <command> for more info" });

    const chunkArray = (arr, maxLen) => {
      let currentChunk = [];
      let currentLen = 0;
      const chunks = [];
      for (const item of arr) {
        if (currentLen + item.length + 1 > maxLen) {
          chunks.push(currentChunk.join("\n"));
          currentChunk = [];
          currentLen = 0;
        }
        currentChunk.push(item);
        currentLen += item.length + 1;
      }
      if (currentChunk.length > 0) chunks.push(currentChunk.join("\n"));
      return chunks;
    };

    const addCommandFields = (name, cmdArray) => {
        if (cmdArray.length === 0) return;
        const chunks = chunkArray(cmdArray, 1000);
        chunks.forEach((chunk, index) => {
            embed.addFields({
                name: index === 0 ? name : `${name} (Continued)`,
                value: chunk
            });
        });
    };

    addCommandFields("🌍 Public Commands", publicCommands);
    addCommandFields("🛡️ Master Commands", modCommands);
    addCommandFields("⚔️ AGR Admin Commands", agrAdminCommands);
    addCommandFields("👑 Owner Commands", adminCommands);

    if (
      publicCommands.length === 0 &&
      modCommands.length === 0 &&
      agrAdminCommands.length === 0 &&
      adminCommands.length === 0
    ) {
      embed.setDescription("No commands available for you.");
    }

    return isSlash
      ? ctx.editReply({ embeds: [embed] })
      : ctx.channel.send({ embeds: [embed] });
  },

  async showCommandInfo(ctx, commandName, isSlash = false) {
    const { client } = ctx;
    const command =
      client.commands.get(commandName.toLowerCase()) ||
      client.commands.find(
        (c) => c.aliases && c.aliases.includes(commandName.toLowerCase()),
      );

    if (!command) {
      const msg = `❌ Command \`${commandName}\` not found.`;
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }

    const user = isSlash ? ctx.user : ctx.author;
    const userPerms = getUserPerms(user.id);
    const requiredPerms = command.perms || 3;

    if (userPerms < requiredPerms) {
      // Technically strict, but help usually hides functionality.
      // We can just say "not found" or show it but mention it's locked.
      const msg = `🛑 You don't have permission to view details for this command.`;
      return isSlash ? ctx.editReply(msg) : ctx.reply(msg);
    }

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${command.name}`)
      .setColor(0x0099ff)
      .setDescription(command.description || "No description provided.")
      .addFields(
        { name: "🔑 Required Level", value: `${requiredPerms}`, inline: true },
        { name: "📝 Usage", value: `\`d?${command.name}\``, inline: true }, // Could be improved if usage syntax was in command object
      );

    if (command.aliases) {
      embed.addFields({
        name: "📎 Aliases",
        value: command.aliases.join(", "),
        inline: true,
      });
    }

    return isSlash
      ? ctx.editReply({ embeds: [embed] })
      : ctx.channel.send({ embeds: [embed] });
  },
};
