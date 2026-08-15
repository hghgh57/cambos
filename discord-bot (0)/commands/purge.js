const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete a number of recent messages in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((opt) =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');

    await interaction.deferReply({ ephemeral: true });

    // The `true` here tells Discord.js to skip (not error on) any message
    // older than 14 days, since Discord's bulk-delete API can't touch those
    // — they'd need to be deleted one at a time instead.
    const deleted = await interaction.channel.bulkDelete(amount, true).catch((err) => {
      console.error('Failed to bulk delete messages:', err);
      return null;
    });

    if (!deleted) {
      return interaction.editReply({
        content: "❌ Something went wrong deleting messages. I may be missing the \"Manage Messages\" permission in this channel.",
      });
    }

    const skippedOld = amount - deleted.size;
    let content = `🗑️ Deleted ${deleted.size} message(s).`;
    if (skippedOld > 0) {
      content += ` ${skippedOld} message(s) were skipped because they're older than 14 days — Discord doesn't allow bulk-deleting those.`;
    }

    await interaction.editReply({ content });
  },
};
