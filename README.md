# MediWatch - AI Health Emergency Monitor

Real-time AI-powered health emergency detection and patient triage system with voice alerts for healthcare facilities.

## Features

- **Real-time Emergency Detection** - AI analyzes video feeds for falls, choking, seizures, and other medical emergencies
- **Patient Risk Triage** - AI-powered risk scoring and prioritization using Wood Wide AI
- **Multi-Room Monitoring** - Dashboard view of multiple patient rooms with vital signs
- **Voice Alert System** - Natural voice announcements via ElevenLabs when emergencies are detected
- **Two-Way Voice Communication** - Staff can interact with the AI assistant using voice commands (LiveKit)
- **AI Observability Dashboard** - Monitor detection accuracy and model performance (Arize)
- **Multi-Language Support** - Alerts in English, Spanish, and Mandarin

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **AI Detection**: Google Gemini 3 Flash (`gemini-3-flash-preview`)
- **Risk Prediction**: Wood Wide AI (patient triage, ML model training)
- **Object Detection**: YOLO service (optional, for person detection)
- **Voice Synthesis**: ElevenLabs API
- **Voice Agent**: LiveKit
- **Observability**: Arize Phoenix
- **Notifications**: Sonner (toast notifications)

## Sponsor Integrations

| Sponsor | Integration |
|---------|-------------|
| **LiveKit** | Voice AI agent for two-way communication |
| **ElevenLabs** | Natural voice alerts in multiple languages |
| **Arize** | AI observability and performance monitoring |
| **Google Gemini** | Vision AI for emergency detection |
| **Wood Wide AI** | Patient risk prediction, triage prioritization, ML model training |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- API keys for:
  - Google Gemini
  - ElevenLabs (optional - for voice alerts)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mediwatch.git
cd mediwatch
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```bash
cp .env.example .env.local
```

4. Add your API keys to `.env.local`:
```env
# Required
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Optional - LiveKit voice agent
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
NEXT_PUBLIC_LIVEKIT_URL=wss://your-app.livekit.cloud

# Optional - Wood Wide AI patient triage
WOODWIDE_API_URL=https://api.woodwide.ai
WOODWIDE_API_KEY=your_woodwide_api_key

# Optional - YOLO person detection
YOLO_SERVICE_URL=http://localhost:8000

# Optional - Supabase persistence
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Main Dashboard (/)

1. **Start Camera** - Click "Start Camera" to enable the video feed
2. **Start Analysis** - Click "Start Analysis" to begin AI monitoring
3. **Voice Agent** - Click "Connect" to enable voice interactions
4. **View Alerts** - Emergency alerts appear in the Alert History panel
5. **Acknowledge** - Click to acknowledge alerts or use voice command

### Patient Triage (/triage)

1. **View Priority Queue** - See patients ranked by risk score
2. **Select Patient** - Click a patient card to view detailed risk factors
3. **Review Factors** - See contributing factors and recommended actions
4. **Monitor Vitals** - Real-time heart rate and oxygen saturation display

### Real-Time Monitoring (/realtime)

1. **Multi-Room View** - Monitor multiple patient rooms simultaneously
2. **Camera Cards** - Each room shows live feed with vital overlays
3. **Risk Indicators** - Color-coded risk badges (Low/Moderate/Elevated/High)
4. **Voice Alerts** - Automatic announcements when emergencies detected

### Voice Commands

- "What happened?" - Get details about the most recent alert
- "Status" - Check current monitoring status
- "Acknowledge" - Acknowledge the latest alert
- "Help" / "Emergency" - Dispatch emergency response

## Demo

To test emergency detection without a real scenario:

1. Start the camera and analysis
2. Simulate a fall by quickly moving out of frame or lying down
3. The AI will detect the potential emergency and trigger alerts

## Project Structure

```
/src
  /app
    /page.tsx                        # Main dashboard
    /triage/page.tsx                 # Patient triage page
    /realtime/page.tsx               # Real-time monitoring page
    /api
      /analyze/route.ts              # Gemini Vision + YOLO detection
      /tts/route.ts                  # ElevenLabs TTS endpoint
      /stats/route.ts                # Observability stats endpoint
      /triage/route.ts               # Wood Wide AI triage recommendations
      /livekit/route.ts              # LiveKit token generation
      /woodwide/[[...path]]/route.ts # Proxy to Wood Wide AI backend
  /components
    /VideoFeed.tsx                   # Webcam capture and display
    /OvershootVideoFeed.tsx          # Alternative video feed component
    /AlertHistory.tsx                # Emergency alert timeline
    /StatsPanel.tsx                  # Monitoring statistics
    /VoiceAgent.tsx                  # LiveKit voice interaction
    /ObservabilityPanel.tsx          # Arize metrics display
    /TriagePanel.tsx                 # Patient priority queue
    /PatientRiskDetail.tsx           # Detailed risk view
    /CameraCard.tsx                  # Room camera with vitals
    /VideoCard.tsx                   # Video display card
    /Sidebar.tsx                     # Navigation sidebar
    /Navbar.tsx                      # Top navigation bar
    /ui
      /Button.tsx                    # Button component
      /Badge.tsx                     # Badge component
      /RiskBadge.tsx                 # Risk level indicator
  /lib
    /gemini.ts                       # Gemini Vision API client
    /elevenlabs.ts                   # ElevenLabs TTS client
    /observability.ts                # Arize tracing utilities
    /woodwide.ts                     # Wood Wide AI client
  /types
    /index.ts                        # TypeScript type definitions
```

## Hackathon Track

**Healthcare** - AI-powered patient safety monitoring for hospitals and care facilities.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## License

MIT

---

Built for NexHacks 2025
