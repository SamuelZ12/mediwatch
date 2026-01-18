'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CameraOff, AlertTriangle } from 'lucide-react';
import type { AnalysisResult, BoundingBox } from '@/types';

interface VideoFeedProps {
  onEmergencyDetected: (result: AnalysisResult) => void;
  location: string;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
  autoStart?: boolean;
}

// Fast analysis - 200ms interval for responsive detection
const ANALYSIS_INTERVAL = 200;
// Cooldown after emergency detection (5 seconds)
const EMERGENCY_COOLDOWN = 5000;

export default function VideoFeed({
  onEmergencyDetected,
  location,
  isAnalyzing,
  setIsAnalyzing,
  autoStart = false,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoStartInitiatedRef = useRef(false);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    setIsPaused(false);
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
    // Skip analysis if in cooldown period
    if (isPaused) return;

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

      if (result.emergency && result.confidence > 0.7) {
        onEmergencyDetected(result);
        
        // Start 5 second cooldown - pause analysis
        setIsPaused(true);
        
        // Clear any existing cooldown timer
        if (cooldownTimeoutRef.current) {
          clearTimeout(cooldownTimeoutRef.current);
        }
        
        // Resume analysis after cooldown
        cooldownTimeoutRef.current = setTimeout(() => {
          setIsPaused(false);
        }, EMERGENCY_COOLDOWN);
      }
    } catch (err) {
      console.error('Analysis error:', err);
    }
  }, [captureFrame, location, onEmergencyDetected, isPaused]);

  const startAnalysis = useCallback(async () => {
    if (!isStreaming) {
      const started = await startCamera();
      if (!started) {
        setError('Failed to start camera');
        setIsAnalyzing(false);
        return;
      }
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0) resolve();
          else setTimeout(checkReady, 50);
        };
        checkReady();
      });
    }

    await new Promise(resolve => setTimeout(resolve, 100));
    analyzeFrame();
    analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL);
  }, [isStreaming, startCamera, analyzeFrame, setIsAnalyzing]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart && !autoStartInitiatedRef.current && !isStreaming && !isAnalyzing) {
      autoStartInitiatedRef.current = true;
      const initialize = async () => {
        setError(null);
        setIsAnalyzing(true);
        await startAnalysis();
      };
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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
      </div>

      <div className="mt-4 px-1">
        <h3 className="text-lg font-bold text-[#423E3B]">{location}</h3>
      </div>
    </div>
  );
}
