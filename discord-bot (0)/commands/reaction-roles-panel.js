const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function saveConfig() {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction-roles-panel')
    .setDescription('Post the reaction-roles panel (roles read from config.json)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute(interaction) {
    const roles = config.reactionRoles || [];
    if (!roles.length) {
      return interaction.reply({ content: 'No reactionRoles are configured in config.json.', ephemeral: true });
    }

    const panelConfig = config.reactionRolesPanel || {};

    const embed = new EmbedBuilder()
      .setTitle(panelConfig.title || 'Reaction Roles')
      .setDescription(
        (panelConfig.description ? `${panelConfig.description}\n\n` : '') +
          roles.map((r) => `${r.emoji} — **${r.label}**`).join('\n')
      )
      .setColor(panelConfig.color || '#5865F2');

    const message = await interaction.channel.send({ embeds: [embed] });

    for (const r of roles) {
      await message.react(r.emoji).catch((err) => {
        console.error(`Failed to react with ${r.emoji} on the reaction-roles panel:`, err);
      });
    }

    // Remember which message is the live panel so the reaction listeners
    // know which one to react to.
    config.reactionRolesMessageId = message.id;
    config.reactionRolesChannelId = message.channel.id;
    saveConfig();

    await interaction.reply({ content: 'Reaction-roles panel posted.', ephemeral: true });
  },
};
