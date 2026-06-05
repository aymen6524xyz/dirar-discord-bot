const { Events } = require("discord.js");
const { waitingUsers } = require("./state");
const { createAndMove } = require("./myvent");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) { 
    // 1. Handle "Waiting User" logic
    if (newState.channelId && waitingUsers.has(newState.id)) {
      waitingUsers.delete(newState.id);
      const member = newState.member;
      const guild = newState.guild;
      console.log(
        `User ${member.user.tag} joined VC, creating Chris's Space...`,
      );
      await createAndMove(member, guild);
      return;
    }

    // 2. Handle "Delete if Empty" logic
    // Check if user Left a channel (oldState.channelId was set)
    if (oldState.channelId) {
      const channel = oldState.channel;
      // Check if it is "Chris's Space" and is now empty
      if (
        channel &&
        channel.name === "Chris's Space" &&
        channel.members.size === 0
      ) {
        try {
          await channel.delete();
          console.log(`🗑️ Deleted empty Chris's Space channel.`);
        } catch (error) {
          console.error("Failed to delete Chris's Space:", error);
        }
      }
    }
  },
};
