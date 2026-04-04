import { NextRequest, NextResponse } from 'next/server';

const ORKEY = process.env.OPENROUTER_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

    const imageModel = model || 'google/gemini-3.1-flash-image-preview';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ORKEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageModel,
        messages: [
          { role: 'user', content: prompt },
        ],
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.error?.message || 'Generation failed' }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    // Check if response contains base64 image data
    if (data.choices?.[0]?.message?.image) {
      return NextResponse.json({ image: data.choices[0].message.image });
    }

    return NextResponse.json({ content, model: imageModel });
  } catch (err) {
    return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
  }
}
