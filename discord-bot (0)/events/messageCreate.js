const config = require('../config.json');

function isExemptStaff(member) {
  const staffRoleIds = [
    ...(config.ticketRoleIds || []),
    ...(config.applicationStaffRoleIds || []),
  ].filter((id) => id && !id.startsWith('PUT_'));

  return staffRoleIds.some((id) => member.roles.cache.has(id)) || member.permissions.has('ManageGuild');
}

// Deletes any message that pings one of the specific users listed in
// pingProtectionUserIds — no timeout, just removes the message. Staff are
// exempt. Returns true if the message was removed.
async function enforcePingProtection(message, member) {
  const protectedIds = (config.pingProtectionUserIds || []).filter((id) => id && !id.startsWith('PUT_'));
  if (!protectedIds.length) return false;
  if (!message.mentions.users.size) return false;

  const hit = message.mentions.users.some((u) => protectedIds.includes(u.id));

  console.log(
    `[ping-protection] message from ${message.author.tag} mentions: ${[...message.mentions.users.keys()].join(', ') || '(none)'} | protected users: ${protectedIds.join(', ')} | hit: ${hit}`
  );

  if (!hit) return false;

  if (isExemptStaff(member)) {
    console.log(`[ping-protection] ${message.author.tag} is exempt staff — not deleting.`);
    return false;
  }

  await message.delete().then(
    () => console.log(`[ping-protection] deleted message from ${message.author.tag}.`),
    (err) => console.error('[ping-protection] FAILED to delete message:', err)
  );

  await message.channel
    .send({ content: `${message.author}, that member can't be pinged.` })
    .then((notice) => setTimeout(() => notice.delete().catch(() => {}), 6000))
    .catch(() => {});

  return true;
}

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) {
      console.warn(`Could not resolve member ${message.author.id} for ping checks.`);
      return;
    }

    // Delete-only protection for specific users.
    if (await enforcePingProtection(message, member)) return;

    // Timeout-based protection for a different set of specific users.
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
