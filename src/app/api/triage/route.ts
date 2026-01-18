import { NextRequest, NextResponse } from 'next/server';
import type { CameraRoom, Alert, TriageRecommendation, RiskPrediction } from '@/types';
import {
  generateTriageRecommendation,
  generatePatientSnapshot,
  predictPatientRisk,
} from '@/lib/woodwide';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rooms, alerts, modelId } = body as {
      rooms: CameraRoom[];
      alerts: Alert[];
      modelId?: string;
    };

    if (!rooms || !Array.isArray(rooms)) {
      return NextResponse.json(
        { error: 'Invalid request: rooms array required' },
        { status: 400 }
      );
    }

    const startTime = performance.now();

    const recommendation = await generateTriageRecommendation(
      rooms,
      alerts || [],
      modelId
    );

    const latencyMs = performance.now() - startTime;
    console.log(`[Triage] Generated recommendation for ${rooms.length} rooms in ${latencyMs.toFixed(0)}ms`);

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error('[Triage] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const patientId = searchParams.get('patientId');

  if (!patientId) {
    return NextResponse.json(
      { error: 'Missing patientId query parameter' },
      { status: 400 }
    );
  }

  // This endpoint can be used to get risk details for a single patient
  // In a real implementation, you would fetch the patient data from a database
  return NextResponse.json({
    message: 'Use POST endpoint with rooms and alerts data for triage recommendations',
    patientId,
  });
}
