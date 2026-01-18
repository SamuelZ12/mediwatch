'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { CameraOff, AlertTriangle, Activity, Zap, Shield, Heart, Brain } from 'lucide-react';
import { RealtimeVision, type StreamInferenceResult } from '@overshoot/sdk';
import { Button, Badge } from '@/components/ui';
import type { AnalysisResult, EmergencyType } from '@/types';

interface OvershootVideoFeedProps {
  onEmergencyDetected: (result: AnalysisResult) => void;
  location: string;
}

const OVERSHOOT_PROMPT = `Describe what you see. If a person is visible, describe their actions and state. Look for signs of choking, seizure, falling, or distress.`;

const EMERGENCY_COLORS: Record<string, string> = {
  choking: '#dc2626',
  heart_attack: '#b91c1c',
  seizure: '#7c3aed',
  fall: '#f59e0b',
  unconscious: '#ef4444',
  distress: '#eab308',
  normal: '#22c55e',
};

const EMERGENCY_ICONS: Record<string, React.ReactNode> = {
  choking: <AlertTriangle className="w-6 h-6" />,
  heart_attack: <Heart className="w-6 h-6" />,
  seizure: <Brain className="w-6 h-6" />,
  fall: <AlertTriangle className="w-6 h-6" />,
  unconscious: <AlertTriangle className="w-6 h-6" />,
  distress: <AlertTriangle className="w-6 h-6" />,
  normal: <Shield className="w-6 h-6" />,
};

export default function OvershootVideoFeed({
  onEmergencyDetected,
  location,
}: OvershootVideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overshootRef = useRef<RealtimeVision | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AnalysisResult | null>(null);
  const [resultCount, setResultCount] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('idle');

  const triggerFlash = useCallback(() => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 300);
  }, []);

  const startAnalysis = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_OVERSHOOT_API_KEY;
    if (!apiKey) {
      setError('Overshoot API key not configured');
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setResultCount(0);

    overshootRef.current = new RealtimeVision({
      apiUrl: 'https://cluster1.overshoot.ai/api/v0.2',
      apiKey,
      prompt: OVERSHOOT_PROMPT,
      source: { type: 'camera', cameraFacing: 'user' },
      debug: true,
      onResult: (result: StreamInferenceResult) => {
        console.log('[Overshoot] RAW Result:', JSON.stringify(result, null, 2));
        setResultCount(prev => prev + 1);
        triggerFlash();
        
        if (!result.ok) {
          console.error('[Overshoot] Result error:', result.error);
          setError(`Error: ${result.error}`);
          return;
        }
        
        setError(null);
        console.log('[Overshoot] Result text:', result.result);
        
        // Show raw result as description for debugging
        const analysisResult: AnalysisResult = {
          emergency: false,
          type: 'normal',
          confidence: 0.5,
          description: result.result || 'No description',
          timestamp: new Date(),
        };
        
        // Check for emergency keywords in the result
        const lowerResult = (result.result || '').toLowerCase();
        if (lowerResult.includes('chok') || lowerResult.includes('can\'t breathe')) {
          analysisResult.emergency = true;
          analysisResult.type = 'choking';
          analysisResult.confidence = 0.8;
        } else if (lowerResult.includes('chest') || lowerResult.includes('heart')) {
          analysisResult.emergency = true;
          analysisResult.type = 'heart_attack';
          analysisResult.confidence = 0.8;
        } else if (lowerResult.includes('seiz') || lowerResult.includes('shak') || lowerResult.includes('convuls')) {
          analysisResult.emergency = true;
          analysisResult.type = 'seizure';
          analysisResult.confidence = 0.8;
        } else if (lowerResult.includes('fall') || lowerResult.includes('ground') || lowerResult.includes('collaps')) {
          analysisResult.emergency = true;
          analysisResult.type = 'fall';
          analysisResult.confidence = 0.8;
        }
        
        setLastResult(analysisResult);
        
        if (analysisResult.emergency) {
          onEmergencyDetected(analysisResult);
        }
      },
      onError: (error: Error) => {
        console.error('[Overshoot] SDK Error:', error);
        setError(error.message);
        setIsAnalyzing(false);
        setIsStreaming(false);
      },
    });

    try {
      console.log('[Overshoot] Starting...');
      setConnectionStatus('connecting');
      await overshootRef.current.start();
      console.log('[Overshoot] Started successfully');
      setConnectionStatus('connected');

      const mediaStream = overshootRef.current.getMediaStream();
      if (mediaStream && videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setIsStreaming(true);
        console.log('[Overshoot] Media stream attached to video');
      } else {
        console.warn('[Overshoot] No media stream available');
        setConnectionStatus('no-stream');
      }
    } catch (err) {
      console.error('[Overshoot] Failed to start:', err);
      setConnectionStatus('error');
      setError(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsAnalyzing(false);
      setIsStreaming(false);
    }
  }, [onEmergencyDetected, parseResult, triggerFlash]);

  const stopAnalysis = useCallback(() => {
    if (overshootRef.current) {
      overshootRef.current.stop();
      overshootRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setIsAnalyzing(false);
    setLastResult(null);
  }, []);

  useEffect(() => {
    return () => stopAnalysis();
  }, [stopAnalysis]);

  const getStatusColor = () => {
    if (!lastResult) return '#8E867E';
    return EMERGENCY_COLORS[lastResult.type] || '#22c55e';
  };

  const confidencePercent = lastResult ? Math.round(lastResult.confidence * 100) : 0;

  return (
    <div className="bg-[#FFFDFB] rounded-[2rem] p-4 shadow-sm border border-[#E5DFD9]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="bg-purple-100 p-2 rounded-xl">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#423E3B]">Overshoot Vision</h3>
            <p className="text-[10px] text-[#8E867E]">Real-time streaming AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <Badge variant="info" pulse>
              <Activity className="w-3 h-3 mr-1" />
              Live
            </Badge>
          )}
        </div>
      </div>

      {/* Video Container with Overlay */}
      <div 
        className="relative rounded-2xl overflow-hidden bg-[#2D2A28] transition-all duration-300"
        style={{
          boxShadow: lastResult?.emergency 
            ? `0 0 30px ${EMERGENCY_COLORS[lastResult.type]}50, inset 0 0 20px ${EMERGENCY_COLORS[lastResult.type]}30`
            : 'none',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full aspect-video object-cover"
        />

        {/* Scanning overlay effect */}
        {isAnalyzing && isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-white/50 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-white/50 rounded-tr-lg" />
            <div className="absolute bottom-16 left-4 w-12 h-12 border-l-2 border-b-2 border-white/50 rounded-bl-lg" />
            <div className="absolute bottom-16 right-4 w-12 h-12 border-r-2 border-b-2 border-white/50 rounded-br-lg" />
            
            {/* Scan line animation */}
            <div 
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-60 animate-scan"
              style={{ animation: 'scan 2s linear infinite' }}
            />
          </div>
        )}

        {/* Flash effect on result */}
        {isFlashing && (
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{ backgroundColor: `${getStatusColor()}20` }}
          />
        )}

        {/* Detection box overlay when emergency detected */}
        {lastResult?.emergency && isStreaming && (
          <div 
            className="absolute inset-8 border-4 rounded-2xl animate-pulse pointer-events-none"
            style={{ borderColor: EMERGENCY_COLORS[lastResult.type] }}
          >
            <div 
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-bold uppercase flex items-center gap-1"
              style={{ backgroundColor: EMERGENCY_COLORS[lastResult.type] }}
            >
              {EMERGENCY_ICONS[lastResult.type]}
              {lastResult.type.replace('_', ' ')}
            </div>
          </div>
        )}

        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D2A28]">
            <div className="text-center text-[#8E867E]">
              <CameraOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera off</p>
              <p className="text-xs opacity-70 mt-1">Click Start to begin</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#2D2A28]/95">
            <div className="text-center text-red-400 p-4">
              <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Top status bar */}
        {isAnalyzing && (
          <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
            <span className={`flex items-center space-x-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ${
              connectionStatus === 'connected' ? 'bg-emerald-500/90' :
              connectionStatus === 'connecting' ? 'bg-yellow-500/90' :
              'bg-purple-500/90'
            }`}>
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span>{connectionStatus.toUpperCase()}</span>
            </span>
            <span className="bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
              Results: {resultCount}
            </span>
          </div>
        )}

        {/* Status panel */}
        {lastResult && isStreaming && (
          <div className="absolute bottom-12 left-2 right-2 bg-black/80 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            {/* Status header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: getStatusColor() }}
                >
                  {EMERGENCY_ICONS[lastResult.type]}
                </div>
                <div>
                  <span className={`text-sm font-bold uppercase ${lastResult.emergency ? 'text-red-400' : 'text-emerald-400'}`}>
                    {lastResult.type.replace('_', ' ')}
                  </span>
                  <p className="text-[10px] text-white/60">
                    {lastResult.emergency ? '⚠️ EMERGENCY DETECTED' : 'No emergency'}
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-2">
              <div className="flex justify-between text-[10px] text-white/70 mb-1">
                <span>Confidence</span>
                <span className="font-mono">{confidencePercent}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${confidencePercent}%`,
                    backgroundColor: getStatusColor(),
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <p className="text-white/80 text-[10px] truncate">{lastResult.description}</p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-2 left-2 right-2">
          <Button
            variant={isAnalyzing ? 'danger' : 'success'}
            onClick={isAnalyzing ? stopAnalysis : startAnalysis}
            className="w-full text-xs py-1.5"
          >
            {isAnalyzing ? (
              <>
                <CameraOff className="w-3 h-3" />
                Stop Stream
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1 text-[10px] text-[#8E867E] space-y-1">
        <div className="flex justify-between">
          <span>• Continuous real-time analysis</span>
          <span className="font-mono">2s clips @ 15% sampling</span>
        </div>
        <div className="flex justify-between">
          <span>• Detects: choking, heart attack, seizure</span>
        </div>
      </div>

      {/* Add CSS for scan animation */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          100% { top: 85%; }
        }
      `}</style>
    </div>
  );
}
