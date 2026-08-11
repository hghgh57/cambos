const config = require('../config.json');

function isExemptStaff(member) {
  const staffRoleIds = [
    ...(config.ticketRoleIds || []),
    ...(config.applicationStaffRoleIds || []),
  ].filter((id) => id && !id.startsWith('PUT_'));

  return staffRoleIds.some((id) => member.roles.cache.has(id)) || member.permissions.has('ManageGuild');
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild || !message.member) return;

    const protectedIds = (config.protectedPingUserIds || []).filter((id) => id && !id.startsWith('PUT_'));
    if (!protectedIds.length) return;

    const pingedProtected = message.mentions.users.some((u) => protectedIds.includes(u.id));
    if (!pingedProtected) return;

    if (isExemptStaff(message.member)) return;

    const minutes = config.pingTimeoutMinutes || 10;

    await message.member.timeout(minutes * 60 * 1000, 'Pinged a protected user').catch((err) => {
      console.error('Failed to timeout member for pinging a protected user:', err);
    });

    await message
      .reply({ content: `⛔ ${message.author}, you've been timed out for ${minutes} minute(s) for pinging a protected user.` })
      .catch(() => {});
  },
};
