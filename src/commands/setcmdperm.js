const { SlashCommandBuilder } = require("discord.js");
const {
  setCommandPerm,
  getCommandRequiredPerms,
} = require("../utils/commandPermsManager");

module.exports = {
  name: "setcmdperm",
  description: "Set custom permission level for a command.",
  perms: 8, // Owner only
  data: new SlashCommandBuilder()
    .setName("setcmdperm")
    .setDescription("Set custom permission level for a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command name")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("level")
        .setDescription("The new permission level (0-8)")
        .setRequired(true),
    ),

  async execute(message, args) {
    if (args.length < 2) {
      return message.reply(
        `❗ Usage: \`${message.content.split(" ")[0]} [command] [level]\``,
      );
    }

    const commandName = args[0].toLowerCase();
    const level = parseInt(args[1], 10);

    if (isNaN(level) || level < 0 || level > 8) {
      return message.reply("❗ Please provide a valid permission level (0-8).");
    }

    // Check if command exists
    const command =
      message.client.commands.get(commandName) ||
      message.client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    // Also check slash commands
    const slashCommand = message.client.slashCommands.get(commandName);

    const foundCommand = command || slashCommand;

    if (!foundCommand) {
      return message.reply(`❌ Command \`${commandName}\` not found.`);
    }

    // Set permission locally on the command name (canonical name)
    const canonicalName = foundCommand.name;
    setCommandPerm(canonicalName, level);

    message.reply(
      `✅ Permission for command \`${canonicalName}\` set to \`${level}\`.`,
    );
  },

  async executeSlash(interaction) {
    const commandName = interaction.options.getString("command").toLowerCase();
    const level = interaction.options.getInteger("level");

    if (level < 0 || level > 8) {
      return interaction.reply({
        content: "❗ Please provide a valid permission level (0-8).",
        ephemeral: true,
      });
    }

    const command =
      interaction.client.commands.get(commandName) ||
      interaction.client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );
    const slashCommand = interaction.client.slashCommands.get(commandName);
    const foundCommand = command || slashCommand;

    if (!foundCommand) {
      return interaction.reply({
        content: `❌ Command \`${commandName}\` not found.`,
        ephemeral: true,
      });
    }

    const canonicalName = foundCommand.name;
    setCommandPerm(canonicalName, level);

    return interaction.reply(
      `✅ Permission for command \`${canonicalName}\` set to \`${level}\`.`,
    );
  },
};
