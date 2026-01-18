# MediWatch YOLO Detection Service

Fast person detection with bounding boxes and face landmarks using YOLOv8.

## Quick Start

```bash
cd python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Runs at `http://localhost:8000`

## API

### `POST /detect`

```json
// Request
{"frame": "base64_image"}

// Response
{
  "persons": [
    {
      "x": 0.2,
      "y": 0.1,
      "width": 0.3,
      "height": 0.6,
      "confidence": 0.95,
      "landmarks": [
        {"x": 0.35, "y": 0.2},
        {"x": 0.45, "y": 0.2},
        {"x": 0.4, "y": 0.3},
        {"x": 0.38, "y": 0.4},
        {"x": 0.42, "y": 0.4}
      ]
    }
  ],
  "timestamp": "2024-01-17T12:00:00Z"
}
```

## Architecture

- **YOLO**: Fast person detection (~20-30ms per frame)
- **OpenCV**: Face landmark detection
- **Gemini** (via Next.js): Emergency classification

The hybrid approach gives you:
- Real-time bounding boxes from YOLO
- Accurate emergency detection from Gemini
