// app/api/words/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// This tells Next.js to not cache this route, or you can set a revalidation period.
// For a word list that doesn't change often, you might set a longer revalidation time.
// For development, revalidate = 0 ensures you always get fresh data.
export const revalidate = 0;

export async function GET() {
    try {
        // Fetch the necessary columns from your 'words' table.
        // We'll use original_id as 'id' for the frontend, and the three language columns.
        const { rows } = await sql`
      SELECT original_id, ju_hoansi, english, afrikaans
      FROM words
      ORDER BY english ASC; /* Optional: Order the words, e.g., by English alphabetically */
    `;

        // Format the data to match the structure your frontend component previously used
        // for the hardcoded dictionary (id, english, ju_hoansi, afrikaans).
        const formattedWords = rows.map(row => ({
            id: row.original_id, // Using original_id from the DB as 'id' for the frontend
            english: row.english,
            ju_hoansi: row.ju_hoansi,
            afrikaans: row.afrikaans
        }));

        return NextResponse.json({ words: formattedWords });

    } catch (error) {
        console.error('API Route - Failed to fetch words:', error);
        // Return a 500 error with a message
        return NextResponse.json(
            { error: 'Failed to fetch words from the database.' },
            { status: 500 }
        );
    }
}
