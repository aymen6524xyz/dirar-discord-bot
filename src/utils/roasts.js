const fs = require('fs');
const path = require('path');

// Load roasts from JSON file
const roastsPath = path.join(__dirname, '../data/roasts.json');
const roastComponentsPath = path.join(__dirname, '../data/roast_components.json');
let roasts = [];
let roastComponents = null;

try {
    if (fs.existsSync(roastComponentsPath)) {
        roastComponents = JSON.parse(fs.readFileSync(roastComponentsPath, 'utf8'));
    }
} catch (error) {
    console.error("Failed to load roast_components.json:", error);
}

try {
    if (fs.existsSync(roastsPath)) {
        roasts = JSON.parse(fs.readFileSync(roastsPath, 'utf8'));
    } else {
        // Fallback default roasts in case file is missing
        roasts = ["🛑 **Stop!** Error loading roasts. Use commands properly."];
        // Create the file with default if missing? Or just log error.
        // For now, let's keep it simple.
    }
} catch (error) {
    console.error("Failed to load roasts.json:", error);
    roasts = ["🛑 **Error** loading roasts system."];
}

// Function to reload roasts (useful if we add a command to update them later)
function reloadRoasts() {
    try {
        if (fs.existsSync(roastsPath)) {
            const data = fs.readFileSync(roastsPath, 'utf8');
            roasts = JSON.parse(data);
        }
        if (fs.existsSync(roastComponentsPath)) {
            roastComponents = JSON.parse(fs.readFileSync(roastComponentsPath, 'utf8'));
        }
        return true;
    } catch (e) {
        console.error(e);
    }
    return false;
}

function generateRoast() {
    if (!roastComponents || !roastComponents.templates || !roastComponents.adjectives || !roastComponents.nouns) {
        return "You are so uninspiring, I can't even generate a roast for you.";
    }
    
    const template = roastComponents.templates[Math.floor(Math.random() * roastComponents.templates.length)];
    const adjective = roastComponents.adjectives[Math.floor(Math.random() * roastComponents.adjectives.length)];
    const noun = roastComponents.nouns[Math.floor(Math.random() * roastComponents.nouns.length)];
    
    return template.replace('{adjective}', adjective).replace('{noun}', noun);
}

const compliments = [
  "👑 **Your Majesty!** Forgive me, but this command is beneath your stature.",
  "🦁 **The Lion!** You don't need permission; you own this place.",
  "✨ **Your Excellence!** A small technicality blocks the path, but you remain the King.",
  "💎 **Pure Diamond!** The code tries to stop you, but your brilliance shines through.",
  "⚔️ **General!** This tool is not worthy of you. You command, and we obey.",
  "🎩 **Mr. President!** The system is in error; you should naturally do as you please.",
  "🚀 **Supreme!** Your level is far too high; this command is too small for you.",
  "🌟 **Shining Star!** Sorry Boss, the bot is confused. You deserve everything.",
  "🌹 **Your Grace!** Do not trouble yourself; this is merely code. You are the origin.",
  "🙇 **We are not worthy!** Forgive me, my liege, I cannot execute the order on such greatness."
];

const vipIds = ['696331073562607676', '541763571357319168', '1082257882935984128'];
const recentRoasts = new Set();
const HISTORY_SIZE = 50;

function getDenialMessage(userId) {
  if (vipIds.includes(userId)) {
    const randomIndex = Math.floor(Math.random() * compliments.length);
    return compliments[randomIndex];
  }
  
  let attempts = 0;
  let message = "";
  
  // Try to generate a unique roast
  do {
      attempts++;
      // 80% chance to use a generated roast vs a static one for higher variety
      if (roastComponents && Math.random() > 0.2) {
          message = generateRoast();
      } else {
          const randomIndex = Math.floor(Math.random() * roasts.length);
          message = roasts[randomIndex];
      }
  } while (recentRoasts.has(message) && attempts < 10);

  // Update history
  recentRoasts.add(message);
  if (recentRoasts.size > HISTORY_SIZE) {
      const iterator = recentRoasts.values();
      recentRoasts.delete(iterator.next().value);
  }

  return message;
}

module.exports = {
  getDenialMessage,
  get roasts() { return roasts }, // Getter to ensure we always get current list if using require ref
  compliments,
  reloadRoasts,
  generateRoast
};
