"""
MediWatch YOLO Detection Service - Optimized for Speed
Fast person detection with bounding boxes, face landmarks, and tracking
"""

import base64
import io
from datetime import datetime, timezone
from typing import List, Optional, Dict, Tuple
import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO
import cv2
from collections import defaultdict
import time

app = FastAPI(title="MediWatch YOLO Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple person tracker state
class PersonTracker:
    def __init__(self, max_age: float = 2.0, iou_threshold: float = 0.3):
        self.tracks: Dict[int, Dict] = {}  # track_id -> {box, last_seen, history}
        self.next_id = 1
        self.max_age = max_age  # seconds before track is removed
        self.iou_threshold = iou_threshold
    
    def _iou(self, box1: Tuple[float, float, float, float], 
             box2: Tuple[float, float, float, float]) -> float:
        """Calculate IoU between two boxes (x, y, w, h format, normalized)"""
        x1, y1, w1, h1 = box1
        x2, y2, w2, h2 = box2
        
        # Convert to x1, y1, x2, y2
        ax1, ay1, ax2, ay2 = x1, y1, x1 + w1, y1 + h1
        bx1, by1, bx2, by2 = x2, y2, x2 + w2, y2 + h2
        
        # Intersection
        ix1 = max(ax1, bx1)
        iy1 = max(ay1, by1)
        ix2 = min(ax2, bx2)
        iy2 = min(ay2, by2)
        
        if ix2 <= ix1 or iy2 <= iy1:
            return 0.0
        
        inter_area = (ix2 - ix1) * (iy2 - iy1)
        area1 = w1 * h1
        area2 = w2 * h2
        union_area = area1 + area2 - inter_area
        
        return inter_area / union_area if union_area > 0 else 0.0
    
    def update(self, detections: List[Dict]) -> List[Dict]:
        """Update tracks with new detections and return tracked persons"""
        current_time = time.time()
        
        # Remove stale tracks
        stale_ids = [
            tid for tid, track in self.tracks.items()
            if current_time - track['last_seen'] > self.max_age
        ]
        for tid in stale_ids:
            del self.tracks[tid]
        
        # Match detections to existing tracks using IoU
        matched_tracks = set()
        results = []
        
        for det in detections:
            det_box = (det['x'], det['y'], det['width'], det['height'])
            best_match = None
            best_iou = self.iou_threshold
            
            for tid, track in self.tracks.items():
                if tid in matched_tracks:
                    continue
                track_box = track['box']
                iou = self._iou(det_box, track_box)
                if iou > best_iou:
                    best_iou = iou
                    best_match = tid
            
            if best_match is not None:
                # Update existing track
                matched_tracks.add(best_match)
                self.tracks[best_match]['box'] = det_box
                self.tracks[best_match]['last_seen'] = current_time
                self.tracks[best_match]['history'].append(det_box)
                # Keep only last 10 positions for motion analysis
                if len(self.tracks[best_match]['history']) > 10:
                    self.tracks[best_match]['history'].pop(0)
                det['track_id'] = best_match
            else:
                # Create new track
                det['track_id'] = self.next_id
                self.tracks[self.next_id] = {
                    'box': det_box,
                    'last_seen': current_time,
                    'history': [det_box]
                }
                self.next_id += 1
            
            results.append(det)
        
        return results


# Initialize tracker
person_tracker = PersonTracker()

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
    track_id: Optional[int] = None  # Unique ID for tracking across frames


class AnalysisRequest(BaseModel):
    frame: str
    location: Optional[str] = "Primary Monitor"


class AnalysisResponse(BaseModel):
    persons: List[BoundingBox]
    timestamp: str
    tracked_count: int = 0  # Number of actively tracked persons


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


def detect_persons(image: np.ndarray) -> Tuple[List[BoundingBox], int]:
    """Fast person detection with YOLO and tracking"""
    if model is None:
        return [], 0
    
    try:
        img_h, img_w = image.shape[:2]
        
        # Run YOLO with optimized settings for speed
        results = model.predict(
            image,
            conf=0.25,
            classes=[0],  # Person class only
            verbose=False,
            half=False,  # Use FP32 for compatibility
            imgsz=480,  # Smaller size for faster inference
        )
        
        detections = []
        
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                
                box_data = {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2}
                landmarks = detect_face_landmarks(image, box_data)
                
                detections.append({
                    'x': float(x1 / img_w),
                    'y': float(y1 / img_h),
                    'width': float((x2 - x1) / img_w),
                    'height': float((y2 - y1) / img_h),
                    'confidence': conf,
                    'landmarks': landmarks
                })
        
        # Apply tracking
        tracked_detections = person_tracker.update(detections)
        
        # Convert to BoundingBox objects
        persons = []
        for det in tracked_detections:
            persons.append(BoundingBox(
                x=det['x'],
                y=det['y'],
                width=det['width'],
                height=det['height'],
                label=f"Person {det.get('track_id', len(persons) + 1)}",
                confidence=det['confidence'],
                landmarks=det.get('landmarks'),
                track_id=det.get('track_id')
            ))
        
        return persons, len(person_tracker.tracks)
    except Exception as e:
        print(f"Detection error: {e}")
        return [], 0


@app.get("/")
async def root():
    return {"status": "running", "models_loaded": models_loaded}


@app.get("/health")
async def health():
    return {"status": "healthy", "model": model is not None}


@app.post("/detect", response_model=AnalysisResponse)
async def detect(request: AnalysisRequest):
    """Fast person detection endpoint with tracking"""
    try:
        image = decode_image(request.frame)
        persons, tracked_count = detect_persons(image)
        
        return AnalysisResponse(
            persons=persons,
            timestamp=datetime.now(timezone.utc).isoformat(),
            tracked_count=tracked_count
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
