"""
MediWatch YOLO Detection Service - Optimized for Speed
Fast person detection with bounding boxes and face landmarks
"""

import base64
import io
from datetime import datetime, timezone
from typing import List, Optional
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import cv2

app = FastAPI(title="MediWatch YOLO Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load optimized YOLO model
print("Loading YOLO model...")
try:
    # Use YOLOv8n for maximum speed
    model = YOLO("yolov8n.pt")
    model.fuse()  # Fuse layers for faster inference
    
    # Face detection
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    
    print("Models loaded successfully")
    models_loaded = True
except Exception as e:
    print(f"Error loading models: {e}")
    model = None
    face_cascade = None
    models_loaded = False


class FaceLandmark(BaseModel):
    x: float
    y: float


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float
    label: Optional[str] = None
    confidence: float
    landmarks: Optional[List[FaceLandmark]] = None


class AnalysisRequest(BaseModel):
    frame: str
    location: Optional[str] = "Primary Monitor"


class AnalysisResponse(BaseModel):
    persons: List[BoundingBox]
    timestamp: str


def decode_image(base64_string: str) -> np.ndarray:
    """Fast base64 decode"""
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    
    image_data = base64.b64decode(base64_string)
    image = Image.open(io.BytesIO(image_data))
    if image.mode != 'RGB':
        image = image.convert('RGB')
    return np.array(image)


def detect_face_landmarks(image: np.ndarray, box: dict) -> List[FaceLandmark]:
    """Detect face landmarks within person bounding box"""
    if face_cascade is None:
        return []
    
    try:
        img_h, img_w = image.shape[:2]
        x1 = max(0, int(box['x1']))
        y1 = max(0, int(box['y1']))
        x2 = min(img_w, int(box['x2']))
        y2 = min(img_h, int(box['y2']))
        
        if x2 <= x1 or y2 <= y1:
            return []
        
        roi = image[y1:y2, x1:x2]
        gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
        
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.15, minNeighbors=4, minSize=(20, 20))
        
        if len(faces) == 0:
            return []
        
        fx, fy, fw, fh = faces[0]
        
        # Generate 5 landmark points (eyes, nose, mouth corners)
        landmarks = [
            FaceLandmark(x=(x1 + fx + fw * 0.3) / img_w, y=(y1 + fy + fh * 0.35) / img_h),   # Left eye
            FaceLandmark(x=(x1 + fx + fw * 0.7) / img_w, y=(y1 + fy + fh * 0.35) / img_h),   # Right eye
            FaceLandmark(x=(x1 + fx + fw * 0.5) / img_w, y=(y1 + fy + fh * 0.55) / img_h),   # Nose
            FaceLandmark(x=(x1 + fx + fw * 0.35) / img_w, y=(y1 + fy + fh * 0.78) / img_h),  # Left mouth
            FaceLandmark(x=(x1 + fx + fw * 0.65) / img_w, y=(y1 + fy + fh * 0.78) / img_h),  # Right mouth
        ]
        
        return landmarks
    except:
        return []


def detect_persons(image: np.ndarray) -> List[BoundingBox]:
    """Fast person detection with YOLO"""
    if model is None:
        return []
    
    try:
        img_h, img_w = image.shape[:2]
        
        # Run YOLO with optimized settings
        results = model.predict(
            image,
            conf=0.25,
            classes=[0],  # Person class only
            verbose=False,
            half=False,  # Use FP32 for compatibility
            imgsz=640,
        )
        
        persons = []
        
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                
                box_data = {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
                landmarks = detect_face_landmarks(image, box_data)
                
                persons.append(BoundingBox(
                    x=float(x1 / img_w),
                    y=float(y1 / img_h),
                    width=float((x2 - x1) / img_w),
                    height=float((y2 - y1) / img_h),
                    label=f"Person {len(persons) + 1}",
                    confidence=conf,
                    landmarks=landmarks if landmarks else None
                ))
        
        return persons
    except Exception as e:
        print(f"Detection error: {e}")
        return []


@app.get("/")
async def root():
    return {"status": "running", "models_loaded": models_loaded}


@app.get("/health")
async def health():
    return {"status": "healthy", "model": model is not None}


@app.post("/detect", response_model=AnalysisResponse)
async def detect(request: AnalysisRequest):
    """Fast person detection endpoint"""
    try:
        image = decode_image(request.frame)
        persons = detect_persons(image)
        
        return AnalysisResponse(
            persons=persons,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
