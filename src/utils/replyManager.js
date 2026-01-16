const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/dm_replies.json');

// Ensure data directory exists
const dataDir = path.dirname(dataPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Helper to load data
function loadData() {
    try {
        if (!fs.existsSync(dataPath)) return {};
        const data = fs.readFileSync(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error loading reply data:", error);
        return {};
    }
}

// Helper to save data
function saveData(data) {
    try {
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error saving reply data:", error);
    }
}

module.exports = {
    /**
     * Links a bot message in the admin channel to the original user ID
     */
    addMessageLink: (botMessageId, userId) => {
        const data = loadData();
        data[botMessageId] = {
            user: userId,
            timestamp: Date.now()
        };
        
        // Optional: Prune old entries (older than 7 days)
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        for (const [msgId, info] of Object.entries(data)) {
            if (now - info.timestamp > ONE_WEEK) {
                delete data[msgId];
            }
        }
        
        saveData(data);
    },

    /**
     * Gets the User ID associated with a bot message
     */
    getOriginalUser: (botMessageId) => {
        const data = loadData();
        const entry = data[botMessageId];
        return entry ? entry.user : null;
    },

    /**
     * Gets the most recent user who sent a DM
     */
    getLastActiveUser: () => {
        const data = loadData();
        let lastUser = null;
        let maxTime = 0;

        for (const info of Object.values(data)) {
            if (info.timestamp > maxTime) {
                maxTime = info.timestamp;
                lastUser = info.user;
            }
        }
        return lastUser;
    }
};
