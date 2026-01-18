# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MediWatch is an AI-powered health emergency detection and patient triage system for healthcare facilities. It uses real-time video analysis to detect emergencies (falls, choking, seizures, unconsciousness) and provides voice alerts to staff. The system also includes AI-powered patient risk scoring and prioritization using Wood Wide AI.

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
- **Risk Prediction:** Wood Wide AI for patient triage and ML model training
- **Object Detection:** YOLO service (optional, for person detection)
- **Voice:** ElevenLabs API for multilingual text-to-speech alerts
- **Real-time:** LiveKit for voice agent infrastructure
- **Observability:** Arize Phoenix for AI model tracing

### Data Flow

#### Emergency Detection
```
Webcam → VideoFeed.tsx (frame capture)
  → /api/analyze (YOLO + Gemini vision)
  → Emergency classification
  → Alert created in page.tsx
  → ElevenLabs TTS if audio enabled
```

#### Patient Triage
```
Patient Rooms → CameraCard.tsx (vitals display)
  → /api/triage (Wood Wide AI)
  → Risk prediction & contributing factors
  → TriagePanel.tsx (priority queue)
  → PatientRiskDetail.tsx (detailed view)
```

### Key Directories
- `src/app/` - Next.js App Router pages and API routes
  - `page.tsx` - Main dashboard
  - `triage/page.tsx` - Patient triage page
  - `realtime/page.tsx` - Real-time monitoring page
- `src/components/` - React components
  - Core: `VideoFeed`, `AlertHistory`, `VoiceAgent`, `StatsPanel`, `ObservabilityPanel`
  - Triage: `TriagePanel`, `PatientRiskDetail`, `CameraCard`
  - Navigation: `Sidebar`, `Navbar`
  - UI: `Button`, `Badge`, `RiskBadge`
- `src/lib/` - API client utilities (`gemini.ts`, `elevenlabs.ts`, `observability.ts`, `woodwide.ts`)
- `src/types/` - TypeScript type definitions

### API Routes
- `POST /api/analyze` - Gemini vision + YOLO detection for emergency detection
- `POST /api/tts` - ElevenLabs text-to-speech generation
- `GET /api/stats` - Observability metrics
- `POST /api/triage` - Wood Wide AI triage recommendations
- `POST /api/livekit` - LiveKit token generation
- `* /api/woodwide/[[...path]]` - Proxy to Wood Wide AI backend

### Core Types
```typescript
type EmergencyType = 'fall' | 'choking' | 'seizure' | 'unconscious' | 'distress' | 'normal'

interface AnalysisResult {
  emergency: boolean
  type: EmergencyType
  confidence: number  // 0-1, alerts trigger at >0.7
  description: string
  timestamp: Date
  persons?: BoundingBox[]  // detected person locations
}

interface BoundingBox {
  x: number      // normalized 0-1
  y: number      // normalized 0-1
  width: number  // normalized 0-1
  height: number // normalized 0-1
  label?: string
  confidence?: number
}

// Wood Wide AI types
interface CameraRoom {
  id: string
  name: string
  roomCode: string
  stats: CameraRoomStats
  isRecording: boolean
  riskScore?: number
}

interface CameraRoomStats {
  heartRate: number
  oxygen: number
  status: 'Normal' | 'Warning' | 'Critical'
}

interface PatientSnapshot {
  patient_id: string
  timestamp: string
  heart_rate: number
  oxygen_saturation: number
  current_status: 'Normal' | 'Warning' | 'Critical'
  alert_count_1h: number
  alert_count_24h: number
  last_emergency_type: EmergencyType | null
  last_emergency_confidence: number
  time_since_last_alert_mins: number
}

interface RiskPrediction {
  patient_id: string
  risk_score: number
  deterioration_probability: number
  contributing_factors: ContributingFactor[]
  recommended_action: string
  confidence: number
}

interface ContributingFactor {
  factor: string
  importance: number
  direction: 'increases_risk' | 'decreases_risk'
}

interface TriagePriority {
  patient_id: string
  patient_name: string
  room_code: string
  risk_score: number
  primary_concern: string
  action: string
}

interface TriageRecommendation {
  priority_order: TriagePriority[]
  timestamp: Date
}
```

## Key Patterns

- Client components marked with `'use client'` directive
- State managed via React hooks in page.tsx, passed down via props
- Frame capture at 2-second intervals to balance responsiveness and API costs
- Confidence threshold of 0.7 for triggering emergency alerts
- Multi-language voice alerts (English, Spanish, Chinese)
- Risk score thresholds: 0-30 (Low), 31-60 (Moderate), 61-80 (Elevated), 81-100 (High)
- Wood Wide AI with fallback to local calculation when API unavailable
- Navigation routes managed via Sidebar component

## Environment Variables

Required (see `.env.example`):
- `GOOGLE_GEMINI_API_KEY` - Gemini vision API
- `ELEVENLABS_API_KEY` - Voice synthesis

Optional:
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `NEXT_PUBLIC_LIVEKIT_URL` - LiveKit voice agent
- `WOODWIDE_API_URL` - Wood Wide AI endpoint (default: https://api.woodwide.ai)
- `WOODWIDE_API_KEY` - Wood Wide AI authentication
- `YOLO_SERVICE_URL` - Person detection service (default: http://localhost:8000)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Database persistence
