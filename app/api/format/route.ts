import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is missing in your environment variables (.env.local)' }, { status: 500 });
    }

    const prompt = `You are an expert resume formatter. 
Take the following raw, messy resume text and reformat it into a perfectly structured, professional HTML document.
Use standard HTML tags like <h1>, <h2>, <ul>, <li>, <strong>, etc.
DO NOT wrap the response in a markdown code block (like \`\`\`html). Just return the raw HTML string directly.
Ensure it looks clean, well-aligned, and highly professional. Do not include <html> or <body> tags, just the inner content.

Raw Resume:
${text}`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    if (!res.ok) {
      const errorData = await res.text();
      console.error('Gemini API Error:', errorData);
      return NextResponse.json({ error: 'AI formatting failed' }, { status: 500 });
    }

    const data = await res.json();
    const formattedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!formattedText) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 500 });
    }

    return NextResponse.json({ formattedText });
  } catch (error) {
    console.error('AI Formatting error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
