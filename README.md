# MediWatch - AI Health Emergency Monitor

Real-time AI-powered health emergency detection with voice alerts for healthcare facilities.

## Features

- **Real-time Emergency Detection** - AI analyzes video feeds for falls, choking, seizures, and other medical emergencies
- **Voice Alert System** - Natural voice announcements via ElevenLabs when emergencies are detected
- **Two-Way Voice Communication** - Staff can interact with the AI assistant using voice commands (LiveKit)
- **AI Observability Dashboard** - Monitor detection accuracy and model performance (Arize)
- **Multi-Language Support** - Alerts in English, Spanish, and Mandarin

## Tech Stack

- **Frontend**: Next.js 14+, TypeScript, Tailwind CSS
- **AI Detection**: Google Gemini 3 Flash (`gemini-3-flash-preview`)
- **Voice Synthesis**: ElevenLabs API
- **Voice Agent**: LiveKit (Browser Speech API for demo)
- **Observability**: Arize Phoenix
- **Notifications**: Sonner (toast notifications)

## Sponsor Integrations

| Sponsor | Integration |
|---------|-------------|
| **LiveKit** | Voice AI agent for two-way communication |
| **ElevenLabs** | Natural voice alerts in multiple languages |
| **Arize** | AI observability and performance monitoring |
| **Google Gemini** | Vision AI for emergency detection |

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
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Start Camera** - Click "Start Camera" to enable the video feed
2. **Start Analysis** - Click "Start Analysis" to begin AI monitoring
3. **Voice Agent** - Click "Connect" to enable voice interactions
4. **View Alerts** - Emergency alerts appear in the Alert History panel
5. **Acknowledge** - Click to acknowledge alerts or use voice command

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
    /page.tsx              # Main dashboard
    /api
      /analyze/route.ts    # Gemini Vision API endpoint
      /tts/route.ts        # ElevenLabs TTS endpoint
      /stats/route.ts      # Observability stats endpoint
  /components
    /VideoFeed.tsx         # Webcam capture and display
    /AlertHistory.tsx      # Emergency alert timeline
    /StatsPanel.tsx        # Monitoring statistics
    /VoiceAgent.tsx        # LiveKit voice interaction
    /ObservabilityPanel.tsx # Arize metrics display
  /lib
    /gemini.ts             # Gemini Vision API client
    /elevenlabs.ts         # ElevenLabs TTS client
    /observability.ts      # Arize tracing utilities
  /types
    /index.ts              # TypeScript type definitions
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
