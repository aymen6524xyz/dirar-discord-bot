const config = require('../config/env');

/**
 * Get user permission level
 * @param {string} userId - Discord user ID
 * @returns {number} Permission level (3, 5, or 8)
 */
function getUserPerms(userId) {
  // CHRIS gets full access (perms 8)
  if (userId === config.ownerId) {
    return 8;
  }
  
  // Check if user is a master
  if (config.masterIds && config.masterIds.includes(userId)) {
    return 5;
  }
  
  // Regular users get perms 3
  return 3;
}

/**
 * Check if user has required permission for a command
 * @param {string} userId - Discord user ID
 * @param {number} requiredPerms - Required permission level for the command
 * @returns {boolean} True if user has required permissions
 */
function hasPermission(userId, requiredPerms) {
  const userPerms = getUserPerms(userId);
  return userPerms >= requiredPerms;
}

module.exports = {
  getUserPerms,
  hasPermission,
};

