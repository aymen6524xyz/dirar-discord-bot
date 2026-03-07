const fs = require("fs");
const path = require("path");

const commandPermsPath = path.join(__dirname, "../config/commandPerms.json");

// Ensure file exists
if (!fs.existsSync(commandPermsPath)) {
  try {
    fs.writeFileSync(commandPermsPath, JSON.stringify({}, null, 2));
  } catch (err) {
    console.error("Could not create commandPerms.json", err);
  }
}

function getCommandPerms() {
  try {
    if (!fs.existsSync(commandPermsPath)) return {};
    const data = fs.readFileSync(commandPermsPath, "utf8");
    return JSON.parse(data) || {};
  } catch (err) {
    console.error("Error reading command perms:", err);
    return {};
  }
}

function setCommandPerm(commandName, permLevel) {
  const current = getCommandPerms();
  current[commandName] = permLevel;
  saveCommandPerms(current);
  return true;
}

function removeCommandPerm(commandName) {
  const current = getCommandPerms();
  if (Object.prototype.hasOwnProperty.call(current, commandName)) {
    delete current[commandName];
    saveCommandPerms(current);
    return true;
  }
  return false;
}

function saveCommandPerms(perms) {
  try {
    fs.writeFileSync(commandPermsPath, JSON.stringify(perms, null, 2));
  } catch (err) {
    console.error("Error saving command perms:", err);
  }
}

function getCommandRequiredPerms(commandName, defaultPerms) {
  const perms = getCommandPerms();
  if (perms[commandName] !== undefined) {
    return perms[commandName];
  }
  return defaultPerms;
}

module.exports = {
  setCommandPerm,
  removeCommandPerm,
  getCommandPerms,
  getCommandRequiredPerms,
};
