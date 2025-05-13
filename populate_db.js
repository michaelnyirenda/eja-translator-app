// populate_db.js
// Explicitly load environment variables from .env.development.local
require('dotenv').config({ path: '.env.development.local' });

const fs = require('fs');
const path = require('path');
const { sql } = require('@vercel/postgres'); // SDK will use process.env.POSTGRES_URL

async function main() {
    // Verify POSTGRES_URL is loaded
    if (!process.env.POSTGRES_URL) {
        console.error("ERROR: POSTGRES_URL is not defined. Make sure .env.development.local is correctly populated by 'vercel env pull'.");
        return;
    }
    console.log("POSTGRES_URL found. Proceeding with script.");

    const filePath = path.join(__dirname, 'words-data.json');
    if (!fs.existsSync(filePath)) {
        console.error(`ERROR: words-data.json not found at ${filePath}. Please ensure it's in the project root.`);
        return;
    }
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    const words = JSON.parse(jsonData);

    console.log(`Found ${words.length} words in words-data.json. Starting insertion...`);

    for (const [index, word] of words.entries()) {
        try {
            await sql`
        INSERT INTO words (original_id, ju_hoansi, english, afrikaans)
        VALUES (
          ${word.id ? String(word.id) : null},
          ${word["jul'hoan_word"] || null},
          ${word.english_word || null},
          ${word.afrikaans || null}
        )
      `;
            const logIdentifier = word.english_word || word["jul'hoan_word"] || `Entry ${index + 1}`;
            console.log(`(${index + 1}/${words.length}) Inserted: ${logIdentifier}`);
        } catch (error) {
            const errorIdentifier = word.english_word || word["jul'hoan_word"] || `Entry at index ${index}`;
            console.error(`Failed to insert word (Identifier: ${errorIdentifier}):`, error);
            // If one fails, you might want to stop to investigate
            // break;
        }
    }
    console.log('Database population complete.');
}

main().catch(error => {
    console.error("An error occurred during the main execution:", error);
});
