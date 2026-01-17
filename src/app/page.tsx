'use client';

import { useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Shield, Volume2, VolumeX, Settings } from 'lucide-react';
import VideoFeed from '@/components/VideoFeed';
import AlertHistory from '@/components/AlertHistory';
import StatsPanel from '@/components/StatsPanel';
import VoiceAgent from '@/components/VoiceAgent';
import ObservabilityPanel from '@/components/ObservabilityPanel';
import type { Alert, AnalysisResult } from '@/types';

export default function Home() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [location, setLocation] = useState('Room 203');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleEmergencyDetected = useCallback(
    async (result: AnalysisResult) => {
      const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        type: result.type,
        confidence: result.confidence,
        description: result.description,
        timestamp: result.timestamp,
        location,
        acknowledged: false,
      };

      setAlerts((prev) => [newAlert, ...prev]);

      // Show toast notification
      toast.error(`${result.type.toUpperCase()} detected in ${location}`, {
        description: result.description,
        duration: 10000,
      });

      // Play voice alert if enabled
      if (audioEnabled) {
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: result.type,
              location,
              language: 'en',
            }),
          });

          if (response.ok) {
            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            if (audioRef.current) {
              audioRef.current.src = audioUrl;
              audioRef.current.play();
            }
          }
        } catch (error) {
          console.error('Failed to play voice alert:', error);
        }
      }
    },
    [location, audioEnabled]
  );

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert
      )
    );
    toast.success('Alert acknowledged');
  };

  const handleVoiceCommand = useCallback(
    (command: string) => {
      if (command === 'acknowledge' && alerts.length > 0) {
        const latestUnacknowledged = alerts.find((a) => !a.acknowledged);
        if (latestUnacknowledged) {
          handleAcknowledge(latestUnacknowledged.id);
        }
      } else if (command === 'dispatch') {
        toast.success('Emergency team dispatched!');
      }
    },
    [alerts]
  );

  const handlePlayAudio = async (alert: Alert) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: alert.type,
          location: alert.location,
          language: 'en',
        }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      toast.error('Failed to play audio');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Toaster richColors position="top-right" />
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MediWatch</h1>
              <p className="text-xs text-gray-400">AI Health Emergency Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Location selector */}
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-gray-400" />
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Room 201</option>
                <option>Room 202</option>
                <option>Room 203</option>
                <option>Room 204</option>
                <option>Hallway A</option>
                <option>Lobby</option>
                <option>ICU Bay 1</option>
              </select>
            </div>

            {/* Audio toggle */}
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`p-2 rounded-lg transition ${
                audioEnabled
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title={audioEnabled ? 'Disable audio alerts' : 'Enable audio alerts'}
            >
              {audioEnabled ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="mb-6">
          <StatsPanel alerts={alerts} isMonitoring={isAnalyzing} />
        </div>

        {/* Grid layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Live Feed - {location}
              </h2>
              <VideoFeed
                onEmergencyDetected={handleEmergencyDetected}
                location={location}
                isAnalyzing={isAnalyzing}
                setIsAnalyzing={setIsAnalyzing}
              />
            </div>
          </div>

          {/* Right Column - Alert History, Voice Agent, Observability */}
          <div className="lg:col-span-1 space-y-6">
            {/* Alert History */}
            <div className="bg-gray-800/50 rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Alert History</h2>
              <AlertHistory
                alerts={alerts}
                onAcknowledge={handleAcknowledge}
                onPlayAudio={handlePlayAudio}
              />
            </div>

            {/* Voice Agent */}
            <VoiceAgent
              recentAlert={alerts[0] || null}
              onVoiceCommand={handleVoiceCommand}
            />

            {/* AI Observability */}
            <ObservabilityPanel />
          </div>
        </div>

        {/* Sponsor badges */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-center text-gray-500 text-sm mb-4">Powered by</p>
          <div className="flex flex-wrap justify-center gap-6 text-gray-400">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <span className="font-medium">LiveKit</span>
              <span className="text-xs text-gray-500">Voice AI</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <span className="font-medium">ElevenLabs</span>
              <span className="text-xs text-gray-500">Voice Synthesis</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <span className="font-medium">Google Gemini</span>
              <span className="text-xs text-gray-500">Vision AI</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg">
              <span className="font-medium">Arize</span>
              <span className="text-xs text-gray-500">Observability</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
