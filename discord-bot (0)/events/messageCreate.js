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
// are exempt. Returns true if the message was removed.
async function enforcePingProtection(message, member) {
  const roleId = config.pingProtectionRoleId;
  if (!roleId || roleId.startsWith('PUT_')) return false;
  if (!message.mentions.users.size) return false;

  // message.mentions.members only reflects members already in Discord.js's
  // cache — it can come back empty even for a clearly-mentioned user, so
  // fetch each mentioned user's member data directly instead of trusting it.
  let protectedHit = false;
  for (const [, mentionedUser] of message.mentions.users) {
    const mentionedMember =
      message.mentions.members?.get(mentionedUser.id) ??
      (await message.guild.members.fetch(mentionedUser.id).catch(() => null));
    if (mentionedMember?.roles.cache.has(roleId)) {
      protectedHit = true;
      break;
    }
  }

  console.log(
    `[ping-protection] message from ${message.author.tag} mentions: ${[...message.mentions.users.keys()].join(', ') || '(none)'} | protected role: ${roleId} | hit: ${protectedHit}`
  );

  if (!protectedHit) return false;

  if (isExemptStaff(member)) {
    console.log(`[ping-protection] ${message.author.tag} is exempt staff — not deleting.`);
    return false;
  }

  await message.delete().then(
    () => console.log(`[ping-protection] deleted message from ${message.author.tag}.`),
    (err) => console.error('[ping-protection] FAILED to delete message:', err)
  );

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

    const member = message.member ?? (await message.guild.members.fetch(message.author.id).catch(() => null));
    if (!member) {
      console.warn(`Could not resolve member ${message.author.id} for ping checks.`);
      return;
    }

    if (await enforcePingProtection(message, member)) return;

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
