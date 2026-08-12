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
    if (message.author.bot || !message.guild) return;

    const protectedIds = (config.protectedPingUserIds || []).filter((id) => id && !id.startsWith('PUT_'));
    if (!protectedIds.length) return;

    // TEMP DEBUG — remove once this is confirmed working.
    console.log(
      `[ping-timeout] message from ${message.author.tag} (${message.author.id}) mentions: ${[...message.mentions.users.keys()].join(', ') || '(none)'} | protected list: ${protectedIds.join(', ')}`
    );

    const pingedProtected = message.mentions.users.some((u) => protectedIds.includes(u.id));
    if (!pingedProtected) {
      console.log('[ping-timeout] no protected user was mentioned — skipping.');
      return;
    }

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) {
      console.warn(`[ping-timeout] could not resolve member ${message.author.id}.`);
      return;
    }

    if (isExemptStaff(member)) {
      console.log(`[ping-timeout] ${message.author.tag} is exempt staff — skipping.`);
      return;
    }

    const minutes = config.pingTimeoutMinutes || 10;
    console.log(`[ping-timeout] attempting to timeout ${message.author.tag} for ${minutes} minute(s)...`);

    await member.timeout(minutes * 60 * 1000, 'Pinged a protected user').then(
      () => console.log(`[ping-timeout] timeout applied successfully to ${message.author.tag}.`),
      (err) => console.error('[ping-timeout] timeout FAILED:', err)
    );

    await message
      .reply({ content: `⛔ ${message.author}, you've been timed out for ${minutes} minute(s) for pinging a protected user.` })
      .catch((err) => {
        console.error('[ping-timeout] failed to send notice:', err);
      });
  },
};
