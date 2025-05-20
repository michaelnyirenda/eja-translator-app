// app/api/sentences/route.js
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(request) {
    try {
        const body = await request.json();
        const inputText = body.input;

        // Forward the input to the external FastAPI service
        const apiResponse = await fetch('http://127.0.0.1:8000/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: inputText }),
        });

        if (!apiResponse.ok) {
            const errorData = await apiResponse.json();
            throw new Error(errorData.detail || 'Translation service error');
        }

        const data = await apiResponse.json();

        // Return the translation from the external service
        return NextResponse.json({ translation: data.translation });
    } catch (error) {
        console.error('Translation API error:', error);
        return NextResponse.json(
            { error: 'Failed to translate sentence.' },
            { status: 500 }
        );
    }
}
