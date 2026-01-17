'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, AlertTriangle, Activity } from 'lucide-react';
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

  const stopCamera = () => {
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
  };

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

  const toggleAnalysis = () => {
    if (isAnalyzing) {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
      setIsAnalyzing(false);
    } else {
      // Analyze every 2 seconds
      analyzeFrame();
      analysisIntervalRef.current = setInterval(analyzeFrame, 2000);
      setIsAnalyzing(true);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

      {/* Analysis status */}
      {isAnalyzing && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 px-3 py-1 rounded">
          <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
          <span className="text-white text-sm">Monitoring</span>
        </div>
      )}

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
