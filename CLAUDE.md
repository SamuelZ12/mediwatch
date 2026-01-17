# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediWatch is an AI-powered health emergency detection system for healthcare facilities. It uses real-time video analysis to detect emergencies (falls, choking, seizures, unconsciousness) and provides voice alerts to staff.

## Build & Development Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm start         # Start production server
npm run lint      # Run ESLint
```

## Architecture

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **AI/Vision:** Google Gemini 3 Flash (`gemini-3-flash-preview`) for emergency classification
- **Voice:** ElevenLabs API for multilingual text-to-speech alerts
- **Real-time:** LiveKit for voice agent infrastructure
- **Observability:** Arize Phoenix for AI model tracing

### Data Flow
```
Webcam → VideoFeed.tsx (frame capture)
  → /api/analyze (Gemini vision)
  → Emergency classification
  → Alert created in page.tsx
  → ElevenLabs TTS if audio enabled
```

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components (VideoFeed, AlertHistory, VoiceAgent, etc.)
- `src/lib/` - API client utilities (gemini.ts, elevenlabs.ts, observability.ts)
- `src/types/` - TypeScript type definitions

### API Routes
- `POST /api/analyze` - Gemini vision analysis for emergency detection
- `POST /api/tts` - ElevenLabs text-to-speech generation
- `GET /api/stats` - Observability metrics

### Core Types
```typescript
type EmergencyType = 'fall' | 'choking' | 'seizure' | 'unconscious' | 'distress' | 'normal'

interface AnalysisResult {
  emergency: boolean
  type: EmergencyType
  confidence: number  // 0-1, alerts trigger at >0.7
  description: string
  timestamp: Date
}
```

## Key Patterns

- Client components marked with `'use client'` directive
- State managed via React hooks in page.tsx, passed down via props
- Frame capture at 2-second intervals to balance responsiveness and API costs
- Confidence threshold of 0.7 for triggering alerts
- Multi-language voice alerts (English, Spanish, Chinese)

## Environment Variables

Required (see `.env.example`):
- `GOOGLE_GEMINI_API_KEY` - Gemini vision API
- `ELEVENLABS_API_KEY` - Voice synthesis

Optional:
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL` - LiveKit voice
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database persistence
