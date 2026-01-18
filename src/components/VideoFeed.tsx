'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, Activity } from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import type { AnalysisResult } from '@/types';

interface VideoFeedProps {
  onEmergencyDetected: (result: AnalysisResult) => void;
  location: string;
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

export default function VideoFeed({
  onEmergencyDetected,
  location,
  isAnalyzing,
  setIsAnalyzing,
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
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
    setIsAnalyzing(false);
  }, [setIsAnalyzing]);

  const captureFrame = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) {
      console.warn('[Gemini] Video or canvas ref not available');
      return null;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.warn('[Gemini] Could not get canvas context');
      return null;
    }

    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('[Gemini] Video dimensions not ready:', video.videoWidth, video.videoHeight);
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get base64 without the data:image/jpeg;base64, prefix
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frameData = captureFrame();
    if (!frameData) {
      console.warn('[Gemini] No frame data captured, skipping analysis');
      return;
    }

    try {
      console.log('[Gemini] Sending frame for analysis...');
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: frameData, location }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Gemini] Analysis failed:', response.status, errorText);
        throw new Error('Analysis failed');
      }

      const result: AnalysisResult = await response.json();
      console.log('[Gemini] Analysis result:', result);
      setLastResult(result);

      if (result.emergency && result.confidence > 0.7) {
        onEmergencyDetected(result);
      }
    } catch (err) {
      console.error('[Gemini] Analysis error:', err);
      setError(`Analysis error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [captureFrame, location, onEmergencyDetected]);

  const startGeminiAnalysis = useCallback(async () => {
    // Ensure camera is running for Gemini
    if (!isStreaming) {
      console.log('[Gemini] Camera not streaming, starting camera...');
      const started = await startCamera();
      if (!started) {
        setError('Failed to start camera for Gemini analysis');
        setIsAnalyzing(false);
        return;
      }
      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });
    }

    // Wait a moment for video to stabilize
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('[Gemini] Starting analysis interval...');
    // Analyze immediately, then every 2 seconds
    analyzeFrame();
    analysisIntervalRef.current = setInterval(analyzeFrame, 2000);
  }, [isStreaming, startCamera, analyzeFrame, setIsAnalyzing]);

  const toggleAnalysis = async () => {
    if (isAnalyzing) {
      // Stop analysis
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      setIsAnalyzing(false);
    } else {
      // Start analysis
      setError(null);
      setIsAnalyzing(true);
      await startGeminiAnalysis();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getStatusColor = () => {
    if (!lastResult) return 'bg-[#8E867E]';
    if (lastResult.emergency) return 'bg-red-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-[#FFFDFB] rounded-[2rem] p-4 shadow-sm border border-[#E5DFD9]">
      {/* Video Container */}
      <div className="relative rounded-2xl overflow-hidden bg-[#2D2A28]">
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
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D2A28]">
            <div className="text-center text-[#8E867E]">
              <CameraOff className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Camera not active</p>
              <p className="text-sm mt-1 opacity-70">Click Start Camera to begin</p>
            </div>
          </div>
        )}

        {/* Error message */}
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

        {/* Status badge */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
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
            AI Provider: Google Gemini
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
