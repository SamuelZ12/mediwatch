'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, Activity } from 'lucide-react';
import { RealtimeVision, type StreamInferenceResult } from '@overshoot/sdk';
import { Button, Badge } from '@/components/ui';
import type { AnalysisResult, EmergencyType } from '@/types';

interface VideoFeedProps {
  onEmergencyDetected: (result: AnalysisResult) => void;
  location: string;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const OVERSHOOT_PROMPT = `Analyze for medical emergencies: fall, choking, seizure, unconscious, distress.
Return JSON: {"emergency": boolean, "type": string, "confidence": 0-1, "description": "brief"}`;
const OVERSHOOT_API_URL =
  process.env.NEXT_PUBLIC_OVERSHOOT_API_URL ?? 'https://cluster1.overshoot.ai/api/v0.2';

export default function VideoFeed({
  onEmergencyDetected,
  location,
  isAnalyzing,
  setIsAnalyzing,
  autoStart = false,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overshootRef = useRef<RealtimeVision | null>(null);
  const activeProviderRef = useRef<'gemini' | 'overshoot' | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'overshoot'>('gemini');
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
    if (overshootRef.current) {
      overshootRef.current.stop();
      overshootRef.current = null;
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
      }
    } catch (err) {
      console.error('[Gemini] Analysis error:', err);
      setError(`Analysis error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [captureFrame, location, onEmergencyDetected]);

  const parseOvershootResult = useCallback((result: string): AnalysisResult => {
    console.log('[Overshoot] Raw result to parse:', result);
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[Overshoot] Parsed result:', parsed);
        return {
          emergency: parsed.emergency ?? false,
          type: (parsed.type as EmergencyType) ?? 'normal',
          confidence: parsed.confidence ?? 0,
          description: parsed.description ?? 'Analysis complete',
          timestamp: new Date(),
        };
      }
      console.warn('[Overshoot] No JSON found in result');
    } catch (err) {
      console.error('[Overshoot] Failed to parse result:', err);
    }
    return {
      emergency: false,
      type: 'normal',
      confidence: 0,
      description: 'Analysis complete',
      timestamp: new Date(),
    };
  }, []);

  const startOvershootAnalysis = useCallback(async () => {
    // Validate API key before starting
    const overshootKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;
    if (!overshootKey) {
      setError('Overshoot API key not configured');
      return;
    }

    // Stop manual camera - Overshoot SDK manages its own
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    overshootRef.current = new RealtimeVision({
      apiUrl: OVERSHOOT_API_URL,
      apiKey: overshootKey,
      prompt: OVERSHOOT_PROMPT,
      source: { type: 'camera', cameraFacing: 'user' },
      backend: 'overshoot',
      debug: true,
      outputSchema: {
        type: 'object',
        properties: {
          emergency: { type: 'boolean' },
          type: { type: 'string', enum: ['fall', 'choking', 'seizure', 'unconscious', 'distress', 'normal'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          description: { type: 'string' },
        },
        required: ['emergency', 'type', 'confidence', 'description'],
      },
      processing: {
        clip_length_seconds: 1,
        delay_seconds: 1,
        fps: 30,
        sampling_ratio: 0.1,
      },
      onResult: (result: StreamInferenceResult) => {
        console.log('[Overshoot] onResult received:', result);
        if (!result.ok) {
          console.error('[Overshoot] Result not ok:', result.error);
          setError(`Analysis error: ${result.error}`);
          return;
        }
        setError(null);
        const parsed = parseOvershootResult(result.result);
        setLastResult(parsed);
        if (parsed.emergency && parsed.confidence > 0.7) {
          onEmergencyDetected(parsed);
        }
      },
      onError: (error: Error) => {
        console.error('[Overshoot] onError:', error);
        setError(`Connection error: ${error.message}`);
        setIsAnalyzing(false);
        setIsStreaming(false);
        activeProviderRef.current = null;
      },
    });

    try {
      console.log('[Overshoot] Starting RealtimeVision...');
      await overshootRef.current.start();
      console.log('[Overshoot] RealtimeVision started successfully');

      const mediaStream = overshootRef.current.getMediaStream();
      if (mediaStream && videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsStreaming(true);
        console.log('[Overshoot] Media stream connected to video element');
      } else {
        console.warn('[Overshoot] Could not get media stream for preview');
      }
    } catch (err) {
      console.error('[Overshoot] Failed to start:', err);
      setError(`Failed to start Overshoot: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsAnalyzing(false);
      setIsStreaming(false);
      activeProviderRef.current = null;
    }
  }, [onEmergencyDetected, parseOvershootResult, setIsAnalyzing]);

  const stopOvershootAnalysis = useCallback(() => {
    if (overshootRef.current) {
      overshootRef.current.stop();
      overshootRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsVideoReady(false);
  }, []);

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

    // Wait a moment for video to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('[Gemini] Starting analysis interval...');
    // Analyze immediately, then every 2 seconds
    analyzeFrame();
    analysisIntervalRef.current = setInterval(analyzeFrame, ANALYSIS_INTERVAL);
  }, [isStreaming, startCamera, analyzeFrame, setIsAnalyzing]);

  const toggleAnalysis = async () => {
    if (isAnalyzing) {
      // Stop analysis
      if (activeProviderRef.current === 'overshoot') {
        stopOvershootAnalysis();
      } else {
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
        }
      }
      setIsAnalyzing(false);
      activeProviderRef.current = null;
    } else {
      // Start analysis
      setError(null);
      activeProviderRef.current = provider;
      setIsAnalyzing(true);
      
      if (provider === 'overshoot') {
        await startOvershootAnalysis();
      } else {
        await startGeminiAnalysis();
      }
    }
  };

  // Handle provider switch while analyzing
  useEffect(() => {
    if (isAnalyzing && activeProviderRef.current && activeProviderRef.current !== provider) {
      if (activeProviderRef.current === 'overshoot') {
        stopOvershootAnalysis();
      } else {
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
        }
      }
      setIsAnalyzing(false);
      setLastResult(null);
      activeProviderRef.current = null;
    }
  }, [provider, isAnalyzing, stopOvershootAnalysis, setIsAnalyzing]);

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

        {/* Status indicators */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isStreaming && (
            <span className="flex items-center space-x-1 bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span>Live</span>
            </span>
          )}
        </div>

        {/* Provider selector and status */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <select
            id="provider-select"
            value={provider}
            onChange={(e) => setProvider(e.target.value as 'gemini' | 'overshoot')}
            className="bg-white/90 text-[#423E3B] text-xs font-bold px-2 py-1 rounded-lg border border-[#E5DFD9] focus:outline-none focus:ring-2 focus:ring-[#E78A62]"
            aria-label="Select AI provider"
          >
            <option value="gemini">Gemini</option>
            <option value="overshoot">Overshoot</option>
          </select>
          {isAnalyzing && (
            <Badge variant="info" pulse>
              <Activity className="w-3 h-3 mr-1" />
              Monitoring
            </Badge>
          )}
        </div>

        {/* Last result display */}
        {lastResult && (
          <div className="absolute bottom-16 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3 border border-[#E5DFD9]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                <span className={`text-sm font-bold ${lastResult.emergency ? 'text-red-600' : 'text-emerald-600'}`}>
                  {lastResult.emergency ? `${lastResult.type.toUpperCase()} DETECTED` : 'Normal'}
                </span>
              </div>
              <span className="text-[#8E867E] text-xs font-medium">
                {Math.round(lastResult.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-[#423E3B] text-xs mt-1 truncate">{lastResult.description}</p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2">
          <Button
            variant={isStreaming ? 'danger' : 'secondary'}
            onClick={isStreaming ? stopCamera : startCamera}
            className="flex-1"
            aria-label={isStreaming ? 'Stop camera' : 'Start camera'}
          >
            {isStreaming ? (
              <>
                <CameraOff className="w-4 h-4" />
                Stop Camera
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Start Camera
              </>
            )}
          </Button>

          <Button
            variant={isAnalyzing ? 'warning' : 'success'}
            onClick={toggleAnalysis}
            className="flex-1"
            aria-label={isAnalyzing ? 'Stop AI analysis' : 'Start AI analysis'}
          >
            <Activity className="w-4 h-4" />
            {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
          </Button>
        </div>
      </div>

      {/* Info bar below video */}
      <div className="mt-4 flex items-center justify-between px-1">
        <div>
          <h3 className="text-lg font-bold text-[#423E3B]">{location}</h3>
          <p className="text-[10px] font-bold text-[#8E867E] tracking-wider uppercase">
            AI Provider: {provider === 'gemini' ? 'Google Gemini' : 'Overshoot Vision'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
            isAnalyzing 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-[#F8F5F2] text-[#8E867E]'
          }`}>
            {isAnalyzing ? 'Active' : 'Standby'}
          </div>
        </div>
      </div>
    </div>
  );
}
