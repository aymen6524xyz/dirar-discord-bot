const fs = require("fs");
const path = require("path");
const config = require("../config/env");

const agrAdminsPath = path.join(__dirname, "../config/agrAdmins.json");

// Ensure file exists
if (!fs.existsSync(agrAdminsPath)) {
  try {
    fs.writeFileSync(agrAdminsPath, JSON.stringify([], null, 2));
  } catch (err) {
    console.error("Could not create agrAdmins.json", err);
  }
}

function getAgrAdmins() {
  try {
    if (!fs.existsSync(agrAdminsPath)) return [];
    const data = fs.readFileSync(agrAdminsPath, "utf8");
    return JSON.parse(data) || [];
  } catch (err) {
    console.error("Error reading AGR admins:", err);
    return [];
  }
}

function addAgrAdmin(userId) {
  const current = getAgrAdmins();
  if (!current.includes(userId)) {
    current.push(userId);
    saveAgrAdmins(current);
    return true;
  }
  return false;
}

function removeAgrAdmin(userId) {
  const current = getAgrAdmins();
  const filtered = current.filter((id) => id !== userId);

  if (filtered.length !== current.length) {
    saveAgrAdmins(filtered);
    return true;
  }
  return false;
}

function saveAgrAdmins(list) {
  try {
    fs.writeFileSync(agrAdminsPath, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error saving AGR admins:", err);
  }
}

function isAgrAdmin(userId) {
  return getAgrAdmins().includes(userId);
}

module.exports = {
  addAgrAdmin,
  removeAgrAdmin,
  getAgrAdmins,
  isAgrAdmin,
};
