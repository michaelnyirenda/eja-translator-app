// app/api/words/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const revalidate = 0;

export async function GET() {
    try {
        // Path to your local JSON file
        const filePath = path.join(process.cwd(), 'data', 'words.json');
        const fileContents = fs.readFileSync(filePath, 'utf-8');
        const rows = JSON.parse(fileContents);

        // Map your keys to what the frontend expects
        const formattedWords = rows.map(row => ({
            id: row.id,
            english: row.english_word,
            ju_hoansi: row["jul'hoan_word"],
            afrikaans: row.afrikaans
        }));

        return NextResponse.json({ words: formattedWords });
    } catch (error) {
        console.error('API Route - Failed to fetch words:', error);
        return NextResponse.json(
            { error: 'Failed to fetch words from the local file.' },
            { status: 500 }
        );
    }
}
