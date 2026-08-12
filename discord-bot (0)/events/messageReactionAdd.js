const config = require('../config.json');

module.exports = {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;
    if (!config.reactionRolesMessageId || reaction.message.id !== config.reactionRolesMessageId) return;

    if (reaction.partial) {
      const fetched = await reaction.fetch().catch(() => null);
      if (!fetched) return;
    }

    const mapping = (config.reactionRoles || []).find((r) => r.emoji === reaction.emoji.name);
    if (!mapping || !mapping.roleId || mapping.roleId.startsWith('PUT_')) return;

    const guild = reaction.message.guild;
    if (!guild) return;

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) return;

    await member.roles.add(mapping.roleId).catch((err) => {
      console.error(`Failed to add reaction role (${mapping.label}) to ${user.tag}:`, err);
    });
  },
};
