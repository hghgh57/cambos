const {
  SlashCommandBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const config = require('../config.json');

// ContainerBuilder.setAccentColor needs a number (or null), not a hex
// string like EmbedBuilder.setColor accepts — convert here.
function hexToInt(hex, fallback = 0x5865f2) {
  if (!hex) return fallback;
  const parsed = parseInt(hex.replace('#', ''), 16);
  return Number.isNaN(parsed) ? fallback : parsed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('apply-panel')
    .setDescription('Post the applications panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const apps = config.applications || [];

    const menu = new StringSelectMenuBuilder()
      .setCustomId('application_select')
      .setPlaceholder('Select an application…')
      .addOptions(
        apps.map((app) => ({
          label: app.label,
          description: (app.description || '').slice(0, 100),
          value: app.id,
          emoji: app.emoji || undefined,
        }))
      );

    const container = new ContainerBuilder()
      .setAccentColor(hexToInt())
      .addTextDisplayComponents((td) => td.setContent('Select which application you want to fill out below.'))
      .addActionRowComponents((row) => row.addComponents(menu));

    await interaction.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
    await interaction.reply({ content: 'Application panel posted.', ephemeral: true });
  },
};
