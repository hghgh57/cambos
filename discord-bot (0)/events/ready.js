const { ActivityType } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const statusText = config.botStatus;
    if (statusText) {
      // For ActivityType.Custom, Discord actually displays whatever is in
      // `state` — `name` is required by the API but ignored for this type.
      client.user.setPresence({
        activities: [{ name: 'Custom Status', type: ActivityType.Custom, state: statusText }],
        status: 'online',
      });
    }
  },
};
