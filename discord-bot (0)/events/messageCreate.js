const config = require('../config.json');

function isExemptStaff(member) {
  const staffRoleIds = [
    ...(config.ticketRoleIds || []),
    ...(config.applicationStaffRoleIds || []),
  ].filter((id) => id && !id.startsWith('PUT_'));

  return staffRoleIds.some((id) => member.roles.cache.has(id)) || member.permissions.has('ManageGuild');
}

// Deletes any message that pings a member holding the configured
// "Ping Protection" role — no timeout, just removes the message. Staff
// (same exemption as the timeout feature below) can still ping them.
// Returns true if the message was removed.
async function enforcePingProtection(message, member) {
  const roleId = config.pingProtectionRoleId;
  if (!roleId || roleId.startsWith('PUT_')) return false;
  if (!message.mentions.users.size) return false;

  const protectedHit = message.mentions.members?.some((m) => m.roles.cache.has(roleId));
  if (!protectedHit) return false;

  if (isExemptStaff(member)) return false;

  await message.delete().catch((err) => {
    console.error('Failed to delete message pinging a ping-protected member:', err);
  });

  await message.channel
    .send({ content: `${message.author}, that member has ping protection — you can't ping them.` })
    .then((notice) => setTimeout(() => notice.delete().catch(() => {}), 6000))
    .catch(() => {});

  return true;
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    // message.member isn't always populated from the gateway cache — fetch
    // it directly rather than silently skipping.
    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) {
      console.warn(`Could not resolve member ${message.author.id} for ping checks.`);
      return;
    }

    // Role-based: delete-on-sight, no punishment.
    if (await enforcePingProtection(message, member)) return;

    // User-list-based: timeout the pinger.
    const protectedIds = (config.protectedPingUserIds || []).filter((id) => id && !id.startsWith('PUT_'));
    if (!protectedIds.length) return;

    const pingedProtected = message.mentions.users.some((u) => protectedIds.includes(u.id));
    if (!pingedProtected) return;

    if (isExemptStaff(member)) return;

    const minutes = config.pingTimeoutMinutes || 10;

    await member.timeout(minutes * 60 * 1000, 'Pinged a protected user').catch((err) => {
      console.error('Failed to timeout member for pinging a protected user:', err);
    });

    await message
      .reply({ content: `⛔ ${message.author}, you've been timed out for ${minutes} minute(s) for pinging a protected user.` })
      .catch((err) => {
        console.error('Failed to send ping-timeout notice:', err);
      });
  },
};
