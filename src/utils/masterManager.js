const fs = require('fs');
const path = require('path');
const config = require('../config/env');

const dynamicMastersPath = path.join(__dirname, '../config/dynamicMasters.json');

// Ensure file exists
if (!fs.existsSync(dynamicMastersPath)) {
    try {
        fs.writeFileSync(dynamicMastersPath, JSON.stringify([], null, 2));
    } catch (err) {
        console.error("Could not create dynamicMasters.json", err);
    }
}

function getDynamicMasters() {
    try {
        if (!fs.existsSync(dynamicMastersPath)) return [];
        const data = fs.readFileSync(dynamicMastersPath, 'utf8');
        return JSON.parse(data) || [];
    } catch (err) {
        console.error("Error reading dynamic masters:", err);
        return [];
    }
}

function getAllMasters() {
    // Combine env masters and dynamic masters
    const dynamic = getDynamicMasters();
    const envMasters = config.masterIds || [];
    // Dedup
    return [...new Set([...envMasters, ...dynamic])];
}


function addMaster(userId) {
    const current = getDynamicMasters();
    if (!current.includes(userId)) {
        current.push(userId);
        saveMasters(current);
        return true;
    }
    return false;
}

function removeMaster(userId) {
    const current = getDynamicMasters();
    const filtered = current.filter(id => id !== userId);
    
    if (filtered.length !== current.length) {
        saveMasters(filtered);
        return true;
    }
    return false;
}

function saveMasters(list) {
    try {
        fs.writeFileSync(dynamicMastersPath, JSON.stringify(list, null, 2));
    } catch (err) {
        console.error("Error saving dynamic masters:", err);
    }
}

function isMaster(userId) {
    return getAllMasters().includes(userId);
}

module.exports = {
    addMaster,
    removeMaster,
    getAllMasters,
    isMaster,
    removeMaster
};
