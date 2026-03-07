const config = require("../config/env");
const { isMaster } = require("./masterManager");
const { isAgrAdmin } = require("./agrAdminManager");

/**
 * Get user permission level
 * @param {string} userId - Discord user ID
 * @returns {number} Permission level (3, 5, 7, 8)
 */
function getUserPerms(userId) {
  // Owners get full access (perms 8)
  if (config.ownerIds && config.ownerIds.includes(userId)) {
    return 8;
  }

  // Custom AGR Admins (perms 7)
  if (isAgrAdmin(userId)) {
    return 7;
  }

  // Check if user is a master (perms 5)
  if (isMaster(userId)) {
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
