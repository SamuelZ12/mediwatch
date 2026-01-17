import { NextRequest, NextResponse } from 'next/server';
import { analyzeFrame } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const { frame, location } = await request.json();

    if (!frame) {
      return NextResponse.json(
        { error: 'No frame data provided' },
        { status: 400 }
      );
    }

    const result = await analyzeFrame(frame);

    // Add location to the result for context
    return NextResponse.json({
      ...result,
      location,
    });
  } catch (error) {
    console.error('Analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}
