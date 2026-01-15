const fs = require('fs');
const path = require('path');

const blacklistPath = path.join(__dirname, '../config/blacklist.json');

// Ensure file exists
if (!fs.existsSync(blacklistPath)) {
    try {
        fs.writeFileSync(blacklistPath, JSON.stringify([], null, 2));
    } catch (err) {
        console.error("Could not create blacklist.json", err);
    }
}

function getBlacklist() {
    try {
        if (!fs.existsSync(blacklistPath)) return [];
        const data = fs.readFileSync(blacklistPath, 'utf8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error("Error reading blacklist:", err);
        return [];
    }
}

function saveBlacklist(list) {
    try {
        fs.writeFileSync(blacklistPath, JSON.stringify(list, null, 2));
    } catch (err) {
        console.error("Error saving blacklist:", err);
    }
}

function blacklistUser(userId, reason = "No reason provided") {
    const list = getBlacklist();
    const existing = list.find(entry => entry.id === userId);
    
    if (existing) {
        return false; // Already blacklisted
    }
    
    list.push({
        id: userId,
        reason: reason,
        date: Date.now()
    });
    
    saveBlacklist(list);
    return true;
}

function unblacklistUser(userId) {
    const list = getBlacklist();
    const initialLength = list.length;
    const filtered = list.filter(entry => entry.id !== userId);
    
    if (filtered.length !== initialLength) {
        saveBlacklist(filtered);
        return true;
    }
    return false;
}

function isBlacklisted(userId) {
    const list = getBlacklist();
    return list.some(entry => entry.id === userId);
}

module.exports = {
    blacklistUser,
    unblacklistUser,
    getBlacklist,
    isBlacklisted
};
