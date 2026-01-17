import { NextRequest, NextResponse } from 'next/server';
import { generateVoiceAlert } from '@/lib/elevenlabs';
import type { EmergencyType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { type, location, language = 'en' } = await request.json();

    if (!type || !location) {
      return NextResponse.json(
        { error: 'Missing type or location' },
        { status: 400 }
      );
    }

    const audioBuffer = await generateVoiceAlert(
      type as EmergencyType,
      location,
      language
    );

    if (!audioBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate voice alert' },
      { status: 500 }
    );
  }
}
