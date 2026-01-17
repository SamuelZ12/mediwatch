# MediWatch - AI Health Emergency Monitor

**Tagline:** AI-powered health emergency detection with real-time voice alerts

**Hackathon Track:** Healthcare

---

## What It Does

MediWatch is an AI-powered health emergency detection system that:

1. **Monitors patients via camera** - Analyzes video feeds in real-time
2. **Detects emergencies** - Identifies falls, choking, seizures, unconsciousness, and distress
3. **Announces alerts** - Natural voice announcements: "Alert: Fall detected in Room 203"
4. **Enables voice interaction** - Staff can ask "What happened?" and get AI responses
5. **Tracks performance** - AI observability dashboard monitors detection accuracy

### Key Features

| Feature | Description |
|---------|-------------|
| **Real-time Emergency Detection** | AI analyzes video for falls, choking, seizures, unconsciousness |
| **Voice Alert System** | Natural voice announcements via ElevenLabs |
| **Two-Way Voice Communication** | Staff can interact with AI using voice commands |
| **AI Observability Dashboard** | Monitor detection accuracy and model performance |
| **Incident Timeline** | Searchable history of all detected events |
| **Multi-Language Support** | Alerts in English, Spanish, and Mandarin |

---

## How We Built It

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, TypeScript, Tailwind CSS |
| **AI Detection** | Google Gemini 3 Flash (`gemini-3-flash-preview`) |
| **Voice Synthesis** | ElevenLabs API |
| **Voice Agent** | LiveKit / Browser Speech API |
| **Observability** | Arize Phoenix |
| **Deployment** | Vercel |

### Architecture

```
[Webcam] → [Video Processor] → [Gemini 3 Flash AI] → [Emergency Classifier]
                                      ↓
                               [Arize Tracing]
                                      ↓
                    [Emergency?] → Yes → [ElevenLabs TTS] → [Voice Alert]
                         ↓                                        ↓
                        No → Log                           [LiveKit Agent]
                                                                  ↓
                                                           [Dashboard]
```

---

## Sponsor Integrations

### LiveKit - Voice AI Infrastructure
- Real-time voice agent for emergency announcements
- Two-way conversations ("What's happening in Room 203?")
- Low-latency communication critical for medical emergencies

### ElevenLabs - Voice Synthesis
- Natural, calm voice for emergency announcements
- Multi-language support (English, Spanish, Mandarin)
- Text-to-speech for incident descriptions

### Arize - AI Observability
- Trace every AI decision (why did it flag this as a fall?)
- Monitor model accuracy over time
- Dashboard showing false positive/negative rates

### Google Gemini 3 Flash
- State-of-the-art vision AI model
- 3x faster than previous models
- 1M token context, multimodal support

---

## Challenges We Ran Into

1. **Real-time video processing** - Balancing frame rate with API costs
2. **False positive reduction** - Tuning prompts to avoid unnecessary alerts
3. **Voice latency** - Ensuring alerts play within 1 second of detection
4. **Browser compatibility** - Speech recognition API varies across browsers

---

## Accomplishments We're Proud Of

- End-to-end emergency detection in under 2 seconds
- Natural voice alerts that don't sound robotic
- Clean, professional healthcare-focused UI
- Integration of 4 sponsor technologies

---

## What We Learned

- Gemini 3 Flash is significantly faster for vision tasks
- ElevenLabs produces remarkably natural voice output
- LiveKit simplifies real-time communication infrastructure
- Arize observability is essential for production AI systems

---

## What's Next for MediWatch

1. **HIPAA Compliance** - Add proper data handling for healthcare
2. **Multi-Camera Support** - Monitor entire hospital floors
3. **Mobile App** - Alerts directly to staff phones
4. **Historical Analytics** - Identify patterns in incidents
5. **Integration with Hospital Systems** - Connect to EMR/EHR

---

## Demo

1. Start the camera and enable AI monitoring
2. Simulate a fall (move out of frame or lie down)
3. AI detects emergency and triggers voice alert
4. Use voice commands: "What happened?" / "Acknowledge"

---

## Try It Out

```bash
git clone https://github.com/yourusername/mediwatch.git
cd mediwatch
npm install
cp .env.example .env.local
# Add your API keys
npm run dev
```

---

## Team

Built for NexHacks 2025

---

## Resources

- [LiveKit Agents SDK](https://docs.livekit.io/agents/)
- [ElevenLabs API](https://elevenlabs.io/docs/api-reference)
- [Arize Phoenix](https://docs.arize.com/phoenix)
- [Gemini 3 Flash Documentation](https://ai.google.dev/gemini-api/docs/gemini-3)
