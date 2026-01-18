# MediWatch Quick Start Guide

## Starting the Complete Application

### Option 1: Start Everything at Once (Recommended)

```bash
./start-all.sh
```

This will start both:
- Python YOLO Detection Service (port 8000)
- Next.js Frontend (port 3000)

Press `Ctrl+C` to stop all services.

---

### Option 2: Start Services Separately

#### Terminal 1 - Python Service:
```bash
cd python-service
./start.sh
# Or manually:
# source venv/bin/activate
# python main.py
```

#### Terminal 2 - Next.js Frontend:
```bash
npm run dev
```

---

## Access the Application

Once both services are running:

- **Frontend**: http://localhost:3000
- **Python API**: http://localhost:8000
- **API Health Check**: http://localhost:8000/health
- **API Docs**: http://localhost:8000/docs (FastAPI auto-generated)

---

## First-Time Setup

If this is your first time running MediWatch:

1. **Install Node.js dependencies** (if not done):
   ```bash
   npm install
   ```

2. **Set up Python service** (if not done):
   ```bash
   cd python-service
   ./setup.sh
   cd ..
   ```

3. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Add your API keys:
     ```bash
     cp .env.example .env.local
     # Edit .env.local and add your keys
     ```

---

## Troubleshooting

### Python service won't start
- Make sure Python 3.12 is installed: `python3.12 --version`
- Ensure virtual environment is set up: `cd python-service && ./setup.sh`
- Check disk space: `df -h`

### Next.js won't start
- Install dependencies: `npm install`
- Clear cache: `rm -rf .next && npm run dev`

### Port already in use
- Python (8000): `lsof -ti:8000 | xargs kill -9`
- Next.js (3000): `lsof -ti:3000 | xargs kill -9`

---

## Services Overview

### Python YOLO Service (`python-service/`)
- **Purpose**: Real-time person detection and fall detection
- **Model**: YOLOv8n (nano - fast and lightweight)
- **Performance**: ~115-145ms per frame
- **Features**:
  - Person detection with bounding boxes
  - Fall detection (horizontal person low in frame)
  - RESTful API with FastAPI

### Next.js Frontend
- **Purpose**: Web interface for video monitoring
- **Features**:
  - Live webcam feed
  - Real-time emergency detection
  - Alert history
  - Voice alerts (ElevenLabs)
  - Multi-language support

---

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run ESLint

# Python service
cd python-service
python main.py           # Start service
python test_service.py   # Test the API
```

---

## Architecture

```
User → Webcam → Next.js Frontend (localhost:3000)
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
Python YOLO Service      Google Gemini API
(localhost:8000)         (Vision Analysis)
        ↓                       ↓
   Person Detection      Emergency Classification
        └───────────┬───────────┘
                    ↓
            Alert Generation
                    ↓
         ElevenLabs TTS (Voice)
```

---

## Need Help?

- Check the main [CLAUDE.md](./CLAUDE.md) for detailed architecture
- Check Python service [README](./python-service/README.md)
- View API docs at http://localhost:8000/docs when service is running
