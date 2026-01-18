import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalysisResult, BoundingBox } from '@/types';

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8000';
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const EMERGENCY_PROMPT = `You are a medical emergency detection AI. Analyze this image for emergencies.

Look for these specific situations:
1. FALL - Person on ground, collapsed, lying in unusual position
2. CHOKING - Hands at throat, face distress, gasping, blue lips
3. SEIZURE - Convulsions, jerking movements, rigidity, foaming
4. UNCONSCIOUS - Unresponsive, slumped over, not moving, eyes closed abnormally
5. DISTRESS - Holding chest, severe pain expression, panic, calling for help
6. NORMAL - Standing/sitting normally, no emergency

Respond ONLY with valid JSON (no markdown):
{"emergency":boolean,"type":"fall"|"choking"|"seizure"|"unconscious"|"distress"|"normal","confidence":0.0-1.0,"description":"brief description"}`;

async function detectWithYOLO(frame: string): Promise<BoundingBox[]> {
  try {
    const response = await fetch(`${YOLO_SERVICE_URL}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frame }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.persons || [];
  } catch {
    return [];
  }
}

async function classifyWithGemini(frame: string): Promise<{
  emergency: boolean;
  type: string;
  confidence: number;
  description: string;
}> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
      EMERGENCY_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: frame,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        emergency: parsed.emergency ?? false,
        type: parsed.type ?? 'normal',
        confidence: parsed.confidence ?? 0,
        description: parsed.description ?? 'Analysis complete',
      };
    }
  } catch (error) {
    console.error('Gemini error:', error);
  }

  return {
    emergency: false,
    type: 'normal',
    confidence: 0,
    description: 'Analysis complete',
  };
}

export async function POST(request: NextRequest) {
  let location = 'Primary Monitor';

  try {
    const body = await request.json();
    const { frame } = body;
    location = body.location || 'Primary Monitor';

    if (!frame) {
      return NextResponse.json({ error: 'No frame data' }, { status: 400 });
    }

    // Run YOLO detection and Gemini classification in parallel
    const [persons, classification] = await Promise.all([
      detectWithYOLO(frame),
      classifyWithGemini(frame),
    ]);

    const result: AnalysisResult = {
      emergency: classification.emergency,
      type: classification.type as AnalysisResult['type'],
      confidence: classification.confidence,
      description: classification.description,
      timestamp: new Date(),
      persons,
    };

    return NextResponse.json({ ...result, location });
  } catch (error) {
    console.error('Analysis error:', error);

    return NextResponse.json({
      emergency: false,
      type: 'normal',
      confidence: 0,
      description: 'Analysis error',
      timestamp: new Date(),
      persons: [],
      location,
    });
  }
}
