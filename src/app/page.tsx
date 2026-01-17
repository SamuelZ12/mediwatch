'use client';

import { useState, useCallback, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { Volume2, VolumeX, AlertTriangle, Clock, Activity, Shield } from 'lucide-react';
import Navbar, { TabType } from '@/components/Navbar';
import VideoCard from '@/components/VideoCard';
import VideoFeed from '@/components/VideoFeed';
import AlertHistory from '@/components/AlertHistory';
import VoiceAgent from '@/components/VoiceAgent';
import ObservabilityPanel from '@/components/ObservabilityPanel';
import type { Alert, AnalysisResult } from '@/types';

// Room configurations for the dashboard
const ROOMS = [
  { number: 'R-101', name: 'Room 101', floor: 'Floor 1' },
  { number: 'R-102', name: 'Room 102', floor: 'Floor 1' },
  { number: 'R-103', name: 'Room 103', floor: 'Floor 1' },
  { number: 'R-104', name: 'Room 104', floor: 'Floor 1' },
  { number: 'R-201', name: 'Room 201', floor: 'Floor 2' },
  { number: 'R-202', name: 'Room 202', floor: 'Floor 2' },
  { number: 'R-203', name: 'Room 203', floor: 'Floor 2' },
  { number: 'R-204', name: 'Room 204', floor: 'Floor 2' },
  { number: 'ICU-1', name: 'ICU Bay 1', floor: 'ICU' },
  { number: 'ICU-2', name: 'ICU Bay 2', floor: 'ICU' },
  { number: 'ICU-3', name: 'ICU Bay 3', floor: 'ICU' },
  { number: 'HALL-A', name: 'Hallway A', floor: 'Common' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState('Room 203');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleEmergencyDetected = useCallback(
    async (result: AnalysisResult, location?: string) => {
      const loc = location || selectedRoom;
      const newAlert: Alert = {
        id: `alert-${Date.now()}`,
        type: result.type,
        confidence: result.confidence,
        description: result.description,
        timestamp: result.timestamp,
        location: loc,
        acknowledged: false,
      };

      setAlerts((prev) => [newAlert, ...prev]);

      toast.error(`${result.type.toUpperCase()} detected in ${loc}`, {
        description: result.description,
        duration: 10000,
      });

      if (audioEnabled) {
        try {
          const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: result.type,
              location: loc,
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
    [selectedRoom, audioEnabled]
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

  const activeAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Toaster richColors position="top-right" />
      <audio ref={audioRef} className="hidden" />

      {/* Navbar */}
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="pt-20 px-6 pb-8 max-w-[1920px] mx-auto">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="animate-fadeIn">
            {/* Stats Bar */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Active Cameras</p>
                    <p className="text-lg font-bold text-emerald-300">{ROOMS.length}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeAlerts > 0 ? 'bg-red-500/20' : 'bg-slate-700/50'}`}>
                    <AlertTriangle className={`w-5 h-5 ${activeAlerts > 0 ? 'text-red-400' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Active Alerts</p>
                    <p className={`text-lg font-bold ${activeAlerts > 0 ? 'text-red-400' : 'text-slate-400'}`}>{activeAlerts}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800/50">
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Uptime</p>
                    <p className="text-lg font-bold text-cyan-300">99.9%</p>
                  </div>
                </div>
              </div>

              {/* Audio toggle */}
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
                  ${audioEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50'
                  }
                `}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
                {audioEnabled ? 'Audio On' : 'Audio Off'}
              </button>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
              {ROOMS.map((room) => (
                <VideoCard
                  key={room.number}
                  roomNumber={room.number}
                  roomName={room.name}
                  onEmergencyDetected={(result) => handleEmergencyDetected(result, room.name)}
                />
              ))}
            </div>

            {/* Recent Alerts Strip */}
            {alerts.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900/50 rounded-xl border border-slate-800/50">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Recent Alerts</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {alerts.slice(0, 5).map((alert) => (
                    <div
                      key={alert.id}
                      className={`
                        flex-shrink-0 px-4 py-2 rounded-lg border text-sm
                        ${alert.acknowledged
                          ? 'bg-slate-800/50 border-slate-700/50 text-slate-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">{alert.type}</span>
                        <span className="text-xs opacity-60">• {alert.location}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real Time Live Camera View */}
        {activeTab === 'realtime' && (
          <div className="animate-fadeIn">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Video Feed - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      Live Feed
                    </h2>
                    <select
                      value={selectedRoom}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {ROOMS.map((room) => (
                        <option key={room.number} value={room.name}>
                          {room.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <VideoFeed
                    onEmergencyDetected={handleEmergencyDetected}
                    location={selectedRoom}
                    isAnalyzing={isAnalyzing}
                    setIsAnalyzing={setIsAnalyzing}
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50">
                  <h2 className="text-lg font-semibold mb-4">Alert History</h2>
                  <AlertHistory
                    alerts={alerts}
                    onAcknowledge={handleAcknowledge}
                    onPlayAudio={handlePlayAudio}
                  />
                </div>

                <VoiceAgent
                  recentAlert={alerts[0] || null}
                  onVoiceCommand={handleVoiceCommand}
                />

                <ObservabilityPanel />
              </div>
            </div>
          </div>
        )}

        {/* Library View */}
        {activeTab === 'library' && (
          <div className="animate-fadeIn">
            <div className="bg-slate-900/50 rounded-xl p-8 border border-slate-800/50 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center border border-emerald-500/30">
                <Shield className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Recording Library</h2>
              <p className="text-slate-400 mb-6 max-w-md mx-auto">
                Access past recordings, flagged incidents, and AI analysis reports. Review historical data for training and compliance.
              </p>
              
              {/* Placeholder cards */}
              <div className="grid md:grid-cols-3 gap-4 mt-8">
                {['Today', 'This Week', 'This Month'].map((period, i) => (
                  <div
                    key={period}
                    className="p-6 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-emerald-500/30 transition-all cursor-pointer group"
                  >
                    <h3 className="font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                      {period}
                    </h3>
                    <p className="text-3xl font-bold text-emerald-400 mt-2">{[12, 84, 312][i]}</p>
                    <p className="text-xs text-slate-500 mt-1">Recordings</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
                <p className="text-amber-300 text-sm">
                  📹 Library feature coming soon. Recordings will be stored and accessible here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-800/50">
          <p className="text-center text-slate-600 text-xs mb-4">Powered by</p>
          <div className="flex flex-wrap justify-center gap-4 text-slate-500">
            {['LiveKit', 'ElevenLabs', 'Google Gemini', 'Arize'].map((name) => (
              <div key={name} className="px-3 py-1.5 bg-slate-900/50 rounded-lg text-xs border border-slate-800/50">
                {name}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
