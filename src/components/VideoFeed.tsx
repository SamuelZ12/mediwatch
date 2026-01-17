'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, Activity } from 'lucide-react';
import { RealtimeVision, type StreamInferenceResult } from '@overshoot/sdk';
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
      setIsStreaming(false);
    }

    overshootRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey: process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY,
      prompt: OVERSHOOT_PROMPT,
      source: { type: 'camera', cameraFacing: 'user' },
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
        activeProviderRef.current = null;
      },
    });

    try {
      console.log('[Overshoot] Starting RealtimeVision...');
      await overshootRef.current.start();
      console.log('[Overshoot] RealtimeVision started successfully');
    } catch (err) {
      console.error('[Overshoot] Failed to start:', err);
      setError(`Failed to start Overshoot: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsAnalyzing(false);
      activeProviderRef.current = null;
    }
  }, [onEmergencyDetected, parseOvershootResult, setIsAnalyzing]);

  const stopOvershootAnalysis = useCallback(() => {
    overshootRef.current?.stop();
    overshootRef.current = null;
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
    if (!lastResult) return 'bg-gray-500';
    if (lastResult.emergency) return 'bg-red-500';
    return 'bg-green-500';
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
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-gray-400">
            <CameraOff className="w-16 h-16 mx-auto mb-4" />
            <p>Camera not active</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90">
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
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as 'gemini' | 'overshoot')}
          className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:border-blue-500"
        >
          <option value="overshoot">Overshoot</option>
          <option value="gemini">Gemini</option>
        </select>
        {isAnalyzing && (
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded">
            <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
            <span className="text-white text-sm">Monitoring</span>
          </div>
        )}
      </div>

      {/* Last result display */}
      {lastResult && (
        <div className="absolute bottom-16 left-4 right-4 bg-black/70 rounded-lg p-3">
          <div className="flex justify-between items-center">
            <span
              className={`text-sm font-medium ${
                lastResult.emergency ? 'text-red-400' : 'text-green-400'
              }`}
            >
              {lastResult.emergency
                ? `${lastResult.type.toUpperCase()} DETECTED`
                : 'Normal'}
            </span>
            <span className="text-gray-400 text-xs">
              {Math.round(lastResult.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-gray-300 text-xs mt-1 truncate">{lastResult.description}</p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-4 left-4 right-4 flex gap-2">
        <button
          onClick={isStreaming ? stopCamera : startCamera}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
            isStreaming
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
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
        </button>

        {isStreaming && (
          <button
            onClick={toggleAnalysis}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
              isAnalyzing
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
          </button>
        )}
      </div>
    </div>
  );
}
