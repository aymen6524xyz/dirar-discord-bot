const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getCommandRequiredPerms } = require("../utils/commandPermsManager");

module.exports = {
  name: "cmd",
  description: "Diplays information about a specific command.",
  perms: 3, // Everyone
  data: new SlashCommandBuilder()
    .setName("cmd")
    .setDescription("Get information about a command")
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command name")
        .setRequired(true),
    ),

  async execute(message, args) {
    if (!args.length) {
      return message.reply("❗ Please provide a command name.");
    }

    const commandName = args[0].toLowerCase();
    const command =
      message.client.commands.get(commandName) ||
      message.client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    if (!command) {
      return message.reply(`❌ Command \`${commandName}\` not found.`);
    }

    const currentPerms = getCommandRequiredPerms(
      command.name,
      command.perms || 3,
    );

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${command.name}`)
      .setColor("#0099ff")
      .addFields(
        {
          name: "Description",
          value: command.description || "No description provided.",
        },
        {
          name: "Aliases",
          value: command.aliases ? command.aliases.join(", ") : "None",
        },
        {
          name: "Default Permission",
          value: `${command.perms || 3}`,
          inline: true,
        },
        { name: "Current Permission", value: `${currentPerms}`, inline: true },
      )
      .setFooter({ text: "AGR Admin System" });

    message.reply({ embeds: [embed] });
  },

  async executeSlash(interaction) {
    const commandName = interaction.options.getString("command").toLowerCase();
    const command =
      interaction.client.commands.get(commandName) ||
      interaction.client.commands.find(
        (cmd) => cmd.aliases && cmd.aliases.includes(commandName),
      );

    // Also check slash commands if not found in prefix commands (though they should be synced usually)
    const slashCommand = interaction.client.slashCommands.get(commandName);

    // Prefer the one found
    const foundCommand = command || slashCommand;

    if (!foundCommand) {
      return interaction.reply({
        content: `❌ Command \`${commandName}\` not found.`,
        ephemeral: true,
      });
    }

    const currentPerms = getCommandRequiredPerms(
      foundCommand.name,
      foundCommand.perms || 3,
    );

    const embed = new EmbedBuilder()
      .setTitle(`Command: ${foundCommand.name}`)
      .setColor("#0099ff")
      .addFields(
        {
          name: "Description",
          value: foundCommand.description || "No description provided.",
        },
        // Aliases only exist on message commands usually
        {
          name: "Aliases",
          value: foundCommand.aliases
            ? foundCommand.aliases.join(", ")
            : "None",
        },
        {
          name: "Default Permission",
          value: `${foundCommand.perms || 3}`,
          inline: true,
        },
        { name: "Current Permission", value: `${currentPerms}`, inline: true },
      )
      .setFooter({ text: "AGR Admin System" });

    return interaction.reply({ embeds: [embed] });
  },
};
