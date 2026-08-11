const { ActivityType } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const statusText = config.botStatus;
    if (statusText) {
      client.user.setPresence({
        activities: [{ name: statusText, type: ActivityType.Custom }],
        status: 'online',
      });
    }
  },
};
