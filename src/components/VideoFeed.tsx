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

export default function VideoFeed({
  onEmergencyDetected,
  location,
  isAnalyzing,
  setIsAnalyzing,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overshootRef = useRef<RealtimeVision | null>(null);
  const activeProviderRef = useRef<'gemini' | 'overshoot' | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [provider, setProvider] = useState<'gemini' | 'overshoot'>('overshoot');
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Unable to access camera. Please grant permission.');
      console.error('Camera error:', err);
    }
  };

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
    activeProviderRef.current = null;
  }, [setIsAnalyzing]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get base64 without the data:image/jpeg;base64, prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
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

      if (result.emergency && result.confidence > 0.7) {
        onEmergencyDetected(result);
      }
    } catch (err) {
      console.error('Analysis error:', err);
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
    if (!process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY) {
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
      apiUrl: '/api/overshoot',
      apiKey: process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY || 'proxy', // Key handled server-side
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

      // Connect Overshoot's media stream to the video element for preview
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
    // Clear the video element's stream
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const toggleAnalysis = async () => {
    if (isAnalyzing) {
      // Stop analysis
      if (provider === 'overshoot') {
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
      activeProviderRef.current = provider;
      setIsAnalyzing(true);
      if (provider === 'overshoot') {
        await startOvershootAnalysis();
      } else {
        // Gemini: Analyze every 2 seconds
        analyzeFrame();
        analysisIntervalRef.current = setInterval(analyzeFrame, 2000);
      }
    }
  };

  // Handle provider switch while analyzing - clean up old provider
  useEffect(() => {
    if (isAnalyzing && activeProviderRef.current && activeProviderRef.current !== provider) {
      // Stop the old provider
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
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getStatusColor = () => {
    if (!lastResult) return 'bg-slate-500';
    if (lastResult.emergency) return 'bg-red-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full aspect-video object-cover"
      />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay when not streaming */}
      {!isStreaming && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
          <div className="text-center text-slate-400">
            <CameraOff className="w-16 h-16 mx-auto mb-4" />
            <p>Camera not active</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          <div className="text-center text-red-400 p-4">
            <AlertTriangle className="w-12 h-12 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Status indicators */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()} animate-pulse`} />
        <span className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded">
          {location}
        </span>
      </div>

      {/* Analysis status and provider selector */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <label className="sr-only" htmlFor="provider-select">
          Select AI provider
        </label>
        <select
          id="provider-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'gemini' | 'overshoot')}
          className="select"
          aria-label="Select AI provider for video analysis"
        >
          <option value="overshoot">Overshoot</option>
          <option value="gemini">Gemini</option>
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
        <div className="absolute bottom-16 left-4 right-4 bg-black/70 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span
              className={`text-sm font-medium ${
                lastResult.emergency ? 'text-red-400' : 'text-emerald-400'
              }`}
            >
              {lastResult.emergency
                ? `${lastResult.type.toUpperCase()} DETECTED`
                : 'Normal'}
            </span>
            <span className="text-slate-400 text-xs">
              {Math.round(lastResult.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-slate-300 text-xs mt-1 truncate">{lastResult.description}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
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

        {isStreaming && (
          <Button
            variant={isAnalyzing ? 'warning' : 'success'}
            onClick={toggleAnalysis}
            className="flex-1"
            aria-label={isAnalyzing ? 'Stop AI analysis' : 'Start AI analysis'}
          >
            <Activity className="w-4 h-4" />
            {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
          </Button>
        )}
      </div>
    </div>
  );
}
