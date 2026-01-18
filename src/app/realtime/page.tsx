'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import VideoFeed from '../../components/VideoFeed';
import AlertHistory from '../../components/AlertHistory';
import { AnalysisResult, Alert } from '../../types';

const RealTimePage: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const lastAnnouncedRef = useRef<{ type: string; timestamp: number } | null>(null);
    const startupAnnouncedRef = useRef(false);
    const audioQueueRef = useRef<HTMLAudioElement[]>([]);

    // Play TTS audio from API
    const playTTSAlert = useCallback(async (type: string, location: string) => {
        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, location, language: 'en' }),
            });

            if (!response.ok) {
                console.error('TTS API error:', response.status);
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Clean up URL after playback
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                // Remove from queue
                audioQueueRef.current = audioQueueRef.current.filter(a => a !== audio);
            });

            // Add to queue and play
            audioQueueRef.current.push(audio);
            await audio.play();
        } catch (error) {
            console.error('Failed to play TTS alert:', error);
        }
    }, []);

    // Play startup message
    const playStartupMessage = useCallback(async () => {
        if (startupAnnouncedRef.current) return;
        startupAnnouncedRef.current = true;

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    type: 'normal', 
                    location: 'Primary Monitor', 
                    language: 'en',
                    customText: 'MediWatch monitoring system activated. Real-time analysis is now running.'
                }),
            });

            if (!response.ok) {
                // Fallback to direct API call if custom text not supported
                // For now, we'll skip startup message if API doesn't support it
                console.log('Startup message skipped (API may not support custom text)');
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });
            await audio.play();
        } catch (error) {
            console.error('Failed to play startup message:', error);
        }
    }, []);

    const handleEmergencyDetected = useCallback((result: AnalysisResult) => {
        const newAlert: Alert = {
            id: `alert-${Date.now()}`,
            type: result.type,
            confidence: result.confidence,
            description: result.description,
            timestamp: result.timestamp,
            location: 'Primary Monitor',
            acknowledged: false,
        };
        setAlerts(prev => [newAlert, ...prev]);

        // Auto-announce emergency with debouncing (prevent spam)
        if (result.emergency && result.type !== 'normal') {
            const now = Date.now();
            const lastAnnounced = lastAnnouncedRef.current;
            const DEBOUNCE_MS = 5000; // 5 seconds between same-type announcements

            if (
                !lastAnnounced ||
                lastAnnounced.type !== result.type ||
                now - lastAnnounced.timestamp > DEBOUNCE_MS
            ) {
                lastAnnouncedRef.current = { type: result.type, timestamp: now };
                playTTSAlert(result.type, 'Primary Monitor');
            }
        }
    }, [playTTSAlert]);

    const handleAcknowledge = useCallback((alertId: string) => {
        setAlerts(prev =>
            prev.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            )
        );
    }, []);

    const handlePlayAudio = useCallback((alert: Alert) => {
        playTTSAlert(alert.type, alert.location);
    }, [playTTSAlert]);

    // Play startup message when analysis begins
    useEffect(() => {
        if (isAnalyzing && !startupAnnouncedRef.current) {
            // Small delay to ensure system is ready
            const timer = setTimeout(() => {
                playStartupMessage();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isAnalyzing, playStartupMessage]);

    return (
        <div className="flex min-h-screen">
            <Sidebar activePage="realtime" />

            <main className="flex-1 ml-20 md:ml-64 p-4 md:p-8 lg:p-12">
                <header className="flex flex-col md:flex-row md:items-start justify-between mb-10 space-y-4 md:space-y-0">
                    <div>
                        <h1 className="text-4xl font-black text-[#423E3B] tracking-tight mb-2">Real Time Monitoring</h1>
                        <p className="text-[#8E867E] font-medium max-w-md">
                            AI-powered video analysis using Gemini or Overshoot. All streams are encrypted and HIPAA compliant.
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border ${
                            isAnalyzing 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                                : 'bg-white/50 text-[#8E867E] border-[#E5DFD9]'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-emerald-500 animate-pulse' : 'bg-[#8E867E]'}`}></span>
                            <span className="text-sm font-bold uppercase tracking-wide">
                                {isAnalyzing ? 'Analyzing' : 'Standby'}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Video Feed */}
                    <div className="lg:col-span-2">
                        <VideoFeed
                            location="Primary Monitor"
                            isAnalyzing={isAnalyzing}
                            setIsAnalyzing={setIsAnalyzing}
                            onEmergencyDetected={handleEmergencyDetected}
                            autoStart={true}
                        />
                    </div>

                    {/* Alert History Panel */}
                    <div className="lg:col-span-1">
                        <AlertHistory
                            alerts={alerts}
                            onAcknowledge={handleAcknowledge}
                            onPlayAudio={handlePlayAudio}
                        />
                    </div>
                </div>

                <footer className="mt-16 pt-8 border-t border-[#E5DFD9] flex flex-col md:flex-row justify-between items-center text-[#8E867E] text-xs font-semibold uppercase tracking-widest">
                    <p>© 2024 MediWatch OS v2.1.4 - HIPAA Compliant</p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                        <a href="#" className="hover:text-[#E78A62] transition-colors">Support</a>
                        <a href="#" className="hover:text-[#E78A62] transition-colors">Security</a>
                        <a href="#" className="hover:text-[#E78A62] transition-colors">API</a>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default RealTimePage;
