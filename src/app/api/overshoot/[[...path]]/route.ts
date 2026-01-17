import { NextRequest, NextResponse } from 'next/server';

const OVERSHOOT_API_URL =
  process.env.OVERSHOOT_API_URL ?? 'https://cluster1.overshoot.ai/api/v0.2';

async function proxyRequest(request: NextRequest, params: { path?: string[] }) {
  const path = params.path?.join('/') ?? '';
  const url = `${OVERSHOOT_API_URL}/${path}`;

  const apiKey = process.env.OVERSHOOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server misconfiguration: OVERSHOOT_API_KEY not set' },
      { status: 500 }
    );
  }

  const body = request.method !== 'GET' && request.method !== 'HEAD'
    ? await request.text()
    : undefined;

  console.log(`[Overshoot Proxy] ${request.method} ${url}`);

  try {
    const response = await fetch(url, {
      method: request.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body,
    });

    const responseText = await response.text();
    console.log(`[Overshoot Proxy] Response: ${response.status} ${responseText.substring(0, 200)}`);

    // Try to parse as JSON, otherwise return as text
    let responseBody: unknown;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = responseText;
    }

    return NextResponse.json(responseBody, {
      status: response.status,
    });
  } catch (error) {
    console.error('[Overshoot Proxy] Error:', error);
    return NextResponse.json(
      { error: `Proxy error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, await params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  return proxyRequest(request, await params);
}
