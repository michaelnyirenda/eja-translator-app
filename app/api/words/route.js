// app/api/words/route.js
import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
// this API route fetches words from the database and returns them in a structured format.
export const revalidate = 0;

export async function GET() {
    try {
        // fetch the necessary columns from your 'words' table.
        // used original_id as 'id' for the frontend, and the three language columns.
        const { rows } = await sql`
      SELECT original_id, ju_hoansi, english, afrikaans
      FROM words
      ORDER BY english ASC; /* Optional: Order the words, e.g., by English alphabetically */
    `;

        // format the data to match the structure your frontend component
        const formattedWords = rows.map(row => ({
            id: row.original_id, // using original_id from the DB as 'id' for the frontend
            english: row.english,
            ju_hoansi: row.ju_hoansi,
            afrikaans: row.afrikaans
        }));

        return NextResponse.json({ words: formattedWords });

    } catch (error) {
        console.error('API Route - Failed to fetch words:', error);
        // return a 500 error with a message
        return NextResponse.json(
            { error: 'Failed to fetch words from the database.' },
            { status: 500 }
        );
    }
}
