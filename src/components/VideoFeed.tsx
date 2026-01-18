'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CameraOff, AlertTriangle, Activity } from 'lucide-react';
import { Badge } from '@/components/ui';
import type { AnalysisResult } from '@/types';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

// Faster analysis interval for quicker detection (500ms = 2 frames/sec)
const ANALYSIS_INTERVAL = 500;

// Emergency state machine cooldown (5 seconds)
const EMERGENCY_COOLDOWN_MS = 5000;

// Emergency detection states
type EmergencyState = 'NORMAL' | 'EMERGENCY_ACTIVE' | 'COOLDOWN';

interface EmergencyTracker {
  state: EmergencyState;
  lastEmergencyType: string | null;
  lastEmergencyTime: number;
  cooldownStartTime: number;
}

// TensorFlow.js Face Landmarks Detection
let tfjsDetector: faceLandmarksDetection.FaceLandmarksDetector | null = null;
let tfjsInitializing = false;
let lastFaceResults: { landmarks: Array<{x: number, y: number, z: number}> } | null = null;

async function initTfjsFaceMesh(): Promise<faceLandmarksDetection.FaceLandmarksDetector | null> {
  if (tfjsDetector) return tfjsDetector;
  if (tfjsInitializing) return null;

  tfjsInitializing = true;
  console.log('[FaceMesh] Initializing TensorFlow.js...');

  try {
    // Set up WebGL backend
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('[FaceMesh] TensorFlow.js backend ready:', tf.getBackend());

    // Create face landmarks detector with tfjs runtime
    tfjsDetector = await faceLandmarksDetection.createDetector(
      faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
      {
        runtime: 'tfjs',
        maxFaces: 1,
        refineLandmarks: true,
      }
    );

    console.log('[FaceMesh] TensorFlow.js detector ready!');
    return tfjsDetector;
  } catch (err) {
    console.error('[FaceMesh] Failed to initialize:', err);
    tfjsInitializing = false;
    return null;
  }
}

interface VideoFeedProps {
  onEmergencyDetected: (result: AnalysisResult) => void;
  location: string;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  autoStart?: boolean;
  enableFaceMesh?: boolean;
}

// MediaPipe face mesh tesselation (triangles connecting landmarks)
const FACEMESH_TESSELATION = [
  // Simplified tesselation - key connections
  [127, 34], [34, 139], [139, 127], [11, 0], [0, 37], [37, 11], [232, 231], [231, 120], [120, 232],
  [72, 37], [37, 39], [39, 72], [128, 121], [121, 47], [47, 128], [232, 121], [121, 128], [128, 232],
  [104, 69], [69, 67], [67, 104], [175, 171], [171, 148], [148, 175], [118, 50], [50, 101], [101, 118],
  [73, 39], [39, 40], [40, 73], [9, 151], [151, 108], [108, 9], [48, 115], [115, 131], [131, 48],
  [194, 211], [211, 204], [204, 194], [74, 40], [40, 185], [185, 74], [80, 42], [42, 183], [183, 80],
  [40, 92], [92, 186], [186, 40], [230, 229], [229, 118], [118, 230], [202, 212], [212, 214], [214, 202],
  [83, 18], [18, 17], [17, 83], [76, 61], [61, 146], [146, 76], [160, 29], [29, 30], [30, 160],
  [56, 157], [157, 173], [173, 56], [106, 63], [63, 68], [68, 106], [169, 150], [150, 136], [136, 169],
  [10, 108], [108, 151], [151, 10], [6, 197], [197, 195], [195, 6], [48, 64], [64, 235], [235, 48],
];

// Draw face mesh using TensorFlow.js landmarks (pixel coordinates)
function drawFaceMeshOnCanvas(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{x: number, y: number, z: number}>,
  canvasWidth: number,
  canvasHeight: number,
  videoWidth: number,
  videoHeight: number
): void {
  if (!landmarks || landmarks.length === 0) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Scale factor from video coordinates to canvas coordinates
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  // Helper to convert video pixel coords to canvas coords
  const toCanvasX = (x: number) => x * scaleX;
  const toCanvasY = (y: number) => y * scaleY;

  // Draw tesselation (mesh lines)
  ctx.strokeStyle = 'rgba(0, 255, 200, 0.3)';
  ctx.lineWidth = 0.5;

  FACEMESH_TESSELATION.forEach(([start, end]) => {
    if (landmarks[start] && landmarks[end]) {
      const x1 = toCanvasX(landmarks[start].x);
      const y1 = toCanvasY(landmarks[start].y);
      const x2 = toCanvasX(landmarks[end].x);
      const y2 = toCanvasY(landmarks[end].y);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });

  // Draw face contour
  const faceContour = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10];
  ctx.strokeStyle = 'rgba(0, 255, 150, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  faceContour.forEach((idx, i) => {
    if (landmarks[idx]) {
      const x = toCanvasX(landmarks[idx].x);
      const y = toCanvasY(landmarks[idx].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw left eye
  const leftEye = [33, 160, 158, 133, 153, 144, 163, 7, 33];
  ctx.strokeStyle = 'rgba(0, 200, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  leftEye.forEach((idx, i) => {
    if (landmarks[idx]) {
      const x = toCanvasX(landmarks[idx].x);
      const y = toCanvasY(landmarks[idx].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw right eye
  const rightEye = [263, 387, 385, 362, 380, 373, 390, 249, 263];
  ctx.beginPath();
  rightEye.forEach((idx, i) => {
    if (landmarks[idx]) {
      const x = toCanvasX(landmarks[idx].x);
      const y = toCanvasY(landmarks[idx].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw lips
  const lips = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61];
  ctx.strokeStyle = 'rgba(255, 100, 150, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  lips.forEach((idx, i) => {
    if (landmarks[idx]) {
      const x = toCanvasX(landmarks[idx].x);
      const y = toCanvasY(landmarks[idx].y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  });
  ctx.stroke();

  // Draw key landmark points
  ctx.fillStyle = 'rgba(0, 255, 200, 0.9)';
  const keyPoints = [1, 4, 5, 6, 10, 33, 133, 263, 362, 61, 291, 199]; // nose, eyes, mouth centers
  keyPoints.forEach(idx => {
    if (landmarks[idx]) {
      const x = toCanvasX(landmarks[idx].x);
      const y = toCanvasY(landmarks[idx].y);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export default function VideoFeed({
  onEmergencyDetected,
  location,
  isAnalyzing,
  setIsAnalyzing,
  autoStart = false,
  enableFaceMesh = true,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [faceMeshReady, setFaceMeshReady] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const faceMeshAnimationRef = useRef<number | null>(null);
  const autoStartInitiatedRef = useRef(false);
  const emergencyTrackerRef = useRef<EmergencyTracker>({
    state: 'NORMAL',
    lastEmergencyType: null,
    lastEmergencyTime: 0,
    cooldownStartTime: 0,
  });

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
        return true;
      }
      return false;
    } catch (err) {
      setError('Unable to access camera. Please grant permission.');
      console.error('Camera error:', err);
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (faceMeshAnimationRef.current) {
      cancelAnimationFrame(faceMeshAnimationRef.current);
      faceMeshAnimationRef.current = null;
    }
    setIsAnalyzing(false);
  }, [setIsAnalyzing]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frameData = captureFrame();
    if (!frameData) return;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: frameData, location }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result: AnalysisResult = await response.json();
      setLastResult(result);

      const now = Date.now();
      const tracker = emergencyTrackerRef.current;

      // State machine for emergency detection
      if (result.emergency && result.confidence > 0.7 && result.type !== 'normal') {
        // Emergency detected
        
        if (tracker.state === 'NORMAL') {
          // Transition: NORMAL -> EMERGENCY_ACTIVE (TRIGGER ALERT)
          console.log(`[Emergency] State transition: NORMAL -> EMERGENCY_ACTIVE (${result.type})`);
          tracker.state = 'EMERGENCY_ACTIVE';
          tracker.lastEmergencyType = result.type;
          tracker.lastEmergencyTime = now;
          onEmergencyDetected(result);
          
        } else if (tracker.state === 'COOLDOWN') {
          // Check if cooldown period has elapsed
          const cooldownElapsed = now - tracker.cooldownStartTime >= EMERGENCY_COOLDOWN_MS;
          
          if (cooldownElapsed) {
            // Cooldown complete, treat as new emergency
            console.log(`[Emergency] Cooldown complete. New emergency: ${result.type}`);
            tracker.state = 'EMERGENCY_ACTIVE';
            tracker.lastEmergencyType = result.type;
            tracker.lastEmergencyTime = now;
            onEmergencyDetected(result);
          } else {
            // Still in cooldown, suppress alert
            const remainingCooldown = Math.ceil((EMERGENCY_COOLDOWN_MS - (now - tracker.cooldownStartTime)) / 1000);
            console.log(`[Emergency] Suppressed (cooldown: ${remainingCooldown}s remaining)`);
          }
          
        } else if (tracker.state === 'EMERGENCY_ACTIVE') {
          // Emergency ongoing - suppress duplicate alerts
          const duration = Math.ceil((now - tracker.lastEmergencyTime) / 1000);
          console.log(`[Emergency] Ongoing ${result.type} (${duration}s) - suppressed`);
        }
        
      } else {
        // Normal/safe state detected
        
        if (tracker.state === 'EMERGENCY_ACTIVE') {
          // Transition: EMERGENCY_ACTIVE -> COOLDOWN
          console.log(`[Emergency] State transition: EMERGENCY_ACTIVE -> COOLDOWN`);
          tracker.state = 'COOLDOWN';
          tracker.cooldownStartTime = now;
          
        } else if (tracker.state === 'COOLDOWN') {
          // Check if cooldown has elapsed
          const cooldownElapsed = now - tracker.cooldownStartTime >= EMERGENCY_COOLDOWN_MS;
          
          if (cooldownElapsed) {
            // Transition: COOLDOWN -> NORMAL
            console.log(`[Emergency] State transition: COOLDOWN -> NORMAL`);
            tracker.state = 'NORMAL';
            tracker.lastEmergencyType = null;
          }
        }
      }
      
    } catch (err) {
      console.error('[Gemini] Analysis error:', err);
      // Don't spam error messages - just log
    }
  }, [captureFrame, location, onEmergencyDetected]);

  const startGeminiAnalysis = useCallback(async () => {
    if (!isStreaming) {
      const started = await startCamera();
      if (!started) {
        setError('Failed to start camera');
        setIsAnalyzing(false);
        return;
      }
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            resolve();
          } else setTimeout(checkReady, 50);
        };
        checkReady();
      });
    }

    // Wait a moment for video to stabilize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('[Gemini] Starting fast analysis interval...');
    // Analyze immediately, then at fast interval
    analyzeFrame();
    analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL);
  }, [isStreaming, startCamera, analyzeFrame, setIsAnalyzing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  // Initialize TensorFlow.js face mesh detector
  useEffect(() => {
    if (!enableFaceMesh) return;

    initTfjsFaceMesh().then((detector) => {
      if (detector) setFaceMeshReady(true);
    });
  }, [enableFaceMesh]);

  // Face mesh detection and drawing loop
  useEffect(() => {
    if (!enableFaceMesh || !faceMeshReady || !isStreaming || !tfjsDetector) {
      setFaceDetected(false);
      return;
    }

    const video = videoRef.current;
    const faceMeshCanvas = faceMeshCanvasRef.current;
    if (!video || !faceMeshCanvas) return;

    let isRunning = true;
    let isProcessing = false;

    const runFaceMeshLoop = async () => {
      if (!isRunning) return;

      // Skip if already processing
      if (isProcessing) {
        if (isRunning) {
          faceMeshAnimationRef.current = requestAnimationFrame(runFaceMeshLoop);
        }
        return;
      }

      isProcessing = true;

      const ctx = faceMeshCanvas.getContext('2d');
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2) {
        const rect = video.getBoundingClientRect();
        if (faceMeshCanvas.width !== rect.width || faceMeshCanvas.height !== rect.height) {
          faceMeshCanvas.width = rect.width;
          faceMeshCanvas.height = rect.height;
        }

        try {
          // Use TensorFlow.js promise-based API
          if (!tfjsDetector) return;
          const faces = await tfjsDetector.estimateFaces(video);

          if (faces.length > 0 && faces[0].keypoints) {
            // Convert keypoints to landmarks format {x, y, z}
            const landmarks = faces[0].keypoints.map((kp) => ({
              x: kp.x,
              y: kp.y,
              z: kp.z ?? 0,
            }));
            lastFaceResults = { landmarks };
            setFaceDetected(true);
            drawFaceMeshOnCanvas(
              ctx,
              landmarks,
              faceMeshCanvas.width,
              faceMeshCanvas.height,
              video.videoWidth,
              video.videoHeight
            );
          } else {
            lastFaceResults = null;
            setFaceDetected(false);
            ctx.clearRect(0, 0, faceMeshCanvas.width, faceMeshCanvas.height);
          }
        } catch (err) {
          console.error('[FaceMesh] Processing error:', err);
        }
      }

      isProcessing = false;

      if (isRunning) {
        faceMeshAnimationRef.current = requestAnimationFrame(runFaceMeshLoop);
      }
    };

    runFaceMeshLoop();

    return () => {
      isRunning = false;
      if (faceMeshAnimationRef.current) {
        cancelAnimationFrame(faceMeshAnimationRef.current);
        faceMeshAnimationRef.current = null;
      }
    };
  }, [enableFaceMesh, faceMeshReady, isStreaming]);

  // Auto-start camera and analysis on mount
  useEffect(() => {
    if (autoStartInitiatedRef.current) return;
    autoStartInitiatedRef.current = true;

    const autoStartAnalysis = async () => {
      setError(null);
      setIsAnalyzing(true);
      await startGeminiAnalysis();
    };

    // Small delay to ensure component is fully mounted
    const timer = setTimeout(autoStartAnalysis, 100);
    return () => clearTimeout(timer);
  }, [setIsAnalyzing, startGeminiAnalysis]);

  // Draw bounding boxes
  const drawBoundingBoxes = useCallback(() => {
    const overlayCanvas = overlayCanvasRef.current;
    const video = videoRef.current;
    
    if (!overlayCanvas || !video) return;

    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) return;

    const rect = video.getBoundingClientRect();
    if (overlayCanvas.width !== rect.width || overlayCanvas.height !== rect.height) {
      overlayCanvas.width = rect.width;
      overlayCanvas.height = rect.height;
    }

    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (!lastResult?.persons || lastResult.persons.length === 0) return;

    lastResult.persons.forEach((box) => {
      const x = box.x * overlayCanvas.width;
      const y = box.y * overlayCanvas.height;
      const width = box.width * overlayCanvas.width;
      const height = box.height * overlayCanvas.height;

      const isEmergency = lastResult.emergency;
      const boxColor = isEmergency ? '#ef4444' : '#22c55e';

      // Draw corner brackets (YOLO style)
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      const cornerLength = Math.min(width, height) * 0.2;
      
      // Top-left
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();
      
      // Top-right
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLength);
      ctx.stroke();
      
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLength);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLength, y + height);
      ctx.stroke();
      
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLength);
      ctx.stroke();

      // Draw track ID label
      if (box.track_id) {
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillStyle = boxColor;
        const label = `ID: ${box.track_id}`;
        const textWidth = ctx.measureText(label).width;
        
        // Background for label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y - 22, textWidth + 10, 20);
        
        // Label text
        ctx.fillStyle = boxColor;
        ctx.fillText(label, x + 5, y - 7);
      }

      // Draw face landmarks
      if (box.landmarks && box.landmarks.length > 0) {
        ctx.fillStyle = boxColor;
        box.landmarks.forEach((point) => {
          const px = point.x * overlayCanvas.width;
          const py = point.y * overlayCanvas.height;
          ctx.beginPath();
          ctx.arc(px, py, 4, 0, Math.PI * 2);
          ctx.fill();
        });

        // Connect facial features
        if (box.landmarks.length >= 5) {
          ctx.strokeStyle = boxColor;
          ctx.lineWidth = 2;
          
          // Draw face outline
          const [leftEye, rightEye, nose, leftMouth, rightMouth] = box.landmarks;
          
          // Eyes to nose
          ctx.beginPath();
          ctx.moveTo(leftEye.x * overlayCanvas.width, leftEye.y * overlayCanvas.height);
          ctx.lineTo(nose.x * overlayCanvas.width, nose.y * overlayCanvas.height);
          ctx.lineTo(rightEye.x * overlayCanvas.width, rightEye.y * overlayCanvas.height);
          ctx.stroke();
          
          // Nose to mouth
          ctx.beginPath();
          ctx.moveTo(nose.x * overlayCanvas.width, nose.y * overlayCanvas.height);
          ctx.lineTo((leftMouth.x + rightMouth.x) / 2 * overlayCanvas.width, leftMouth.y * overlayCanvas.height);
          ctx.stroke();
          
          // Mouth line
          ctx.beginPath();
          ctx.moveTo(leftMouth.x * overlayCanvas.width, leftMouth.y * overlayCanvas.height);
          ctx.lineTo(rightMouth.x * overlayCanvas.width, rightMouth.y * overlayCanvas.height);
          ctx.stroke();
        }
      }
    });
  }, [lastResult]);

  useEffect(() => {
    if (!isStreaming) return;
    drawBoundingBoxes();
  }, [lastResult, isStreaming, drawBoundingBoxes]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const resizeObserver = new ResizeObserver(() => drawBoundingBoxes());
    resizeObserver.observe(video);
    return () => resizeObserver.disconnect();
  }, [drawBoundingBoxes]);

  return (
    <div className="bg-[#FFFDFB] rounded-[2rem] p-4 shadow-sm border border-[#E5DFD9]">
      <div className="relative rounded-2xl overflow-hidden bg-[#2D2A28]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Face mesh overlay canvas */}
        <canvas
          ref={faceMeshCanvasRef}
          className="absolute inset-0 pointer-events-none w-full h-full"
          style={{ zIndex: 15 }}
        />

        {/* Bounding box overlay canvas */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D2A28]">
            <div className="text-center text-[#8E867E]">
              <CameraOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Initializing...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D2A28]/95">
            <div className="text-center text-red-400 p-4">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
              <p className="font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Status indicators */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center space-x-1 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span>Live</span>
            </span>
          )}
        </div>

        {/* Status indicators */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-2">
          {isAnalyzing && (
            <Badge variant="info" pulse>
              <Activity className="w-3 h-3 mr-1" />
              Monitoring
            </Badge>
          )}
          {enableFaceMesh && faceMeshReady && faceDetected && (
            <div className="bg-gradient-to-r from-cyan-500/90 to-purple-500/90 text-white text-[10px] font-bold px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/30 shadow-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                <span>FACE TRACKED</span>
              </div>
              <div className="text-[8px] font-medium opacity-90 mt-0.5">
                Eyes · Nose · Mouth
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info bar below video */}
      <div className="mt-4 flex items-center justify-between px-1">
        <h3 className="text-lg font-bold text-[#423E3B]">{location}</h3>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
          isAnalyzing 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-[#F8F5F2] text-[#8E867E]'
        }`}>
          {isAnalyzing ? 'Active' : 'Standby'}
        </div>
      </div>
    </div>
  );
}
