const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config/dmChatConfig.json');
const vipIds = ['696331073562607676', '541763571357319168'];

function loadConfig() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    let config = JSON.parse(data);

    // Migration: Convert string IDs to objects if needed
    if (config.allowedUsers && config.allowedUsers.length > 0 && typeof config.allowedUsers[0] === 'string') {
        config.allowedUsers = config.allowedUsers.map(id => ({ id, expires: null }));
        saveConfig(config);
    }
    return config;
  } catch (err) {
    return { targetChannelId: "", allowedUsers: [] };
  }
}

function saveConfig(config) {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function isVip(userId) {
  return vipIds.includes(userId);
}

function isAllowed(userId) {
  const config = loadConfig();
  // removed isVip check so admins can test revocation on themselves
  if (isVip(userId)) return true; 

  const userObj = config.allowedUsers.find(u => u.id === userId);
  if (!userObj) return false;

  // Check expiration
  if (userObj.expires && userObj.expires < Date.now()) {
      removeAllowedUser(userId); // Auto-revoke
      return false;
  }

  return true;
}

function addAllowedUser(userId, durationMs = null) {
  const config = loadConfig();
  const expires = durationMs ? Date.now() + durationMs : null;

  const existingIndex = config.allowedUsers.findIndex(u => u.id === userId);
  
  if (existingIndex !== -1) {
    config.allowedUsers[existingIndex].expires = expires;
  } else {
    config.allowedUsers.push({ id: userId, expires });
  }

  saveConfig(config);
  return true;
}

function removeAllowedUser(userId) {
  const config = loadConfig();
  const initialLength = config.allowedUsers.length;
  // Filter out the user by ID
  config.allowedUsers = config.allowedUsers.filter(u => u.id !== userId);
  
  if (config.allowedUsers.length !== initialLength) {
    saveConfig(config);
    return true;
  }
  return false;
}

function setTargetChannel(channelId) {
  const config = loadConfig();
  config.targetChannelId = channelId;
  saveConfig(config);
}

function getTargetChannelId() {
  const config = loadConfig();
  return config.targetChannelId;
}

module.exports = {
  isAllowed,
  isVip,
  addAllowedUser,
  removeAllowedUser,
  setTargetChannel,
  getTargetChannelId
};
