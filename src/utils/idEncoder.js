// Constants for zero-width characters
const ZERO_WIDTH = {
    START: '\u200B', // Zero Width Space
    ONE: '\u200C',   // Zero Width Non-Joiner
    ZERO: '\u200D',  // Zero Width Joiner
    END: '\u200E'    // Left-To-Right Mark (invisible in most contexts)
};

module.exports = {
    /**
     * Encodes a User ID (snowflake) into a string of invisible characters.
     * Uses binary representation: 1 -> \u200C, 0 -> \u200D
     */
    encodeUserInfo: (userId) => {
        if (!userId) return '';
        
        // Convert to binary string
        const binary = BigInt(userId).toString(2);
        
        // Map to invisible chars
        let encoded = ZERO_WIDTH.START;
        for (let char of binary) {
            encoded += (char === '1') ? ZERO_WIDTH.ONE : ZERO_WIDTH.ZERO;
        }
        encoded += ZERO_WIDTH.END;
        
        return encoded;
    },

    /**
     * Decodes the invisible string back into a User ID.
     */
    decodeUserInfo: (content) => {
        if (!content) return null;

        // Escape regex special chars manually if needed, or just build simplistic pattern
        // Pattern: START [ONE|ZERO]+ END
        // We scan the string for the START and END markers
        
        const startIdx = content.indexOf(ZERO_WIDTH.START);
        const endIdx = content.indexOf(ZERO_WIDTH.END);

        if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null;

        const encodedPart = content.substring(startIdx + 1, endIdx);
        let binary = '';
        
        for (let char of encodedPart) {
            if (char === ZERO_WIDTH.ONE) binary += '1';
            else if (char === ZERO_WIDTH.ZERO) binary += '0';
            else return null; // Invalid char in sequence
        }

        try {
            return BigInt('0b' + binary).toString();
        } catch (e) {
            return null;
        }
    }
};