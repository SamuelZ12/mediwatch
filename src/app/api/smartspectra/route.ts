import { NextRequest, NextResponse } from 'next/server';

/**
 * SmartSpectra API Proxy
 * 
 * Proxies requests to SmartSpectra OnPrem gateway for:
 * - Health check
 * - Current vitals snapshot
 * - Configuration
 */

const GATEWAY_URL = process.env.SMARTSPECTRA_GATEWAY_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'health';

  try {
    switch (action) {
      case 'health':
        // Check if SmartSpectra gateway is available
        const healthResponse = await fetch(`${GATEWAY_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (healthResponse.ok) {
          const health = await healthResponse.json();
          return NextResponse.json({
            available: true,
            status: health,
            gateway: GATEWAY_URL,
          });
        } else {
          return NextResponse.json({
            available: false,
            error: 'Gateway not responding',
            gateway: GATEWAY_URL,
          });
        }

      case 'config':
        // Return SmartSpectra configuration
        return NextResponse.json({
          enabled: process.env.NEXT_PUBLIC_SMARTSPECTRA_ENABLED === 'true',
          gatewayUrl: process.env.NEXT_PUBLIC_SMARTSPECTRA_GATEWAY_URL || 'ws://localhost:8080/ws',
          hudStreamUrl: process.env.NEXT_PUBLIC_SMARTSPECTRA_HUD_URL || 'http://localhost:8080/hud.mjpg',
        });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[SmartSpectra API] Error:', error);
    
    // Gateway not available - return fallback response
    return NextResponse.json({
      available: false,
      error: error instanceof Error ? error.message : 'Gateway unavailable',
      gateway: GATEWAY_URL,
      fallback: true,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        // Start SmartSpectra processing (if gateway supports it)
        const startResponse = await fetch(`${GATEWAY_URL}/api/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        });

        if (startResponse.ok) {
          return NextResponse.json({ success: true, message: 'Processing started' });
        } else {
          return NextResponse.json({ success: false, error: 'Failed to start' }, { status: 500 });
        }

      case 'stop':
        // Stop SmartSpectra processing
        const stopResponse = await fetch(`${GATEWAY_URL}/api/stop`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (stopResponse.ok) {
          return NextResponse.json({ success: true, message: 'Processing stopped' });
        } else {
          return NextResponse.json({ success: false, error: 'Failed to stop' }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[SmartSpectra API] POST Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed',
    }, { status: 500 });
  }
}
