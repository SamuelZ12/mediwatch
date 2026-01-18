'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import VideoFeed from '../../components/VideoFeed';
import AlertHistory from '../../components/AlertHistory';
import VitalsPanel from '../../components/VitalsPanel';
import { AnalysisResult, Alert } from '../../types';

const RealTimePage: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const lastAnnouncedRef = useRef<{ type: string; timestamp: number } | null>(null);
    const startupAnnouncedRef = useRef(false);
    const audioQueueRef = useRef<HTMLAudioElement[]>([]);

    // Play TTS audio from API (non-blocking)
    const playTTSAlert = useCallback((type: string, location: string) => {
        // Fire and forget - don't block the main thread
        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, location, language: 'en' }),
        })
        .then(response => {
            if (!response.ok) {
                console.error('TTS API error:', response.status);
                return null;
            }
            return response.blob();
        })
        .then(audioBlob => {
            if (!audioBlob) return;
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            // Clean up URL after playback
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
                audioQueueRef.current = audioQueueRef.current.filter(a => a !== audio);
            });

            // Add to queue and play
            audioQueueRef.current.push(audio);
            audio.play().catch(err => console.error('Audio play error:', err));
        })
        .catch(error => {
            console.error('Failed to play TTS alert:', error);
        });
    }, []);

    // Play startup message (non-blocking)
    const playStartupMessage = useCallback(() => {
        if (startupAnnouncedRef.current) return;
        startupAnnouncedRef.current = true;

        fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                type: 'normal', 
                location: 'Primary Monitor', 
                language: 'en',
                customText: 'MediWatch monitoring system activated. Real-time analysis is now running.'
            }),
        })
        .then(response => {
            if (!response.ok) {
                console.log('Startup message skipped');
                return null;
            }
            return response.blob();
        })
        .then(audioBlob => {
            if (!audioBlob) return;
            
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            audio.addEventListener('ended', () => {
                URL.revokeObjectURL(audioUrl);
            });
            audio.play().catch(err => console.error('Startup audio error:', err));
        })
        .catch(error => {
            console.error('Failed to play startup message:', error);
        });
    }, []);

    // Send email notification for emergencies
    const sendEmailNotification = useCallback((result: AnalysisResult, location: string) => {
        // Handle timestamp - could be Date object or string
        const timestamp = result.timestamp instanceof Date 
            ? result.timestamp.toISOString() 
            : String(result.timestamp);
            
        fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: result.type,
                description: result.description,
                confidence: result.confidence,
                location,
                timestamp,
            }),
        })
        .then(response => {
            if (response.ok) {
                console.log('[Email] Emergency notification sent successfully');
            } else {
                console.error('[Email] Failed to send notification:', response.status);
            }
        })
        .catch(error => {
            console.error('[Email] Error sending notification:', error);
        });
    }, []);

    const handleEmergencyDetected = useCallback((result: AnalysisResult) => {
        // Check if this alert type already exists and is not acknowledged
        setAlerts(prev => {
            const existingAlert = prev.find(
                alert => alert.type === result.type && !alert.acknowledged
            );
            
            // If same alert type already exists (unacknowledged), don't add duplicate
            if (existingAlert) {
                console.log(`[Alert] Duplicate ${result.type} alert suppressed - already exists`);
                return prev;
            }
            
            const newAlert: Alert = {
                id: `alert-${Date.now()}`,
                type: result.type,
                confidence: result.confidence,
                description: result.description,
                timestamp: result.timestamp,
                location: 'Primary Monitor',
                acknowledged: false,
            };
            
            console.log(`[Alert] New ${result.type} alert added`);
            return [newAlert, ...prev];
        });

        // Auto-announce emergency with 5-second debouncing
        if (result.emergency && result.type !== 'normal') {
            const now = Date.now();
            const lastAnnounced = lastAnnouncedRef.current;
            const DEBOUNCE_MS = 5000; // 5 seconds between TTS announcements

            // Only announce if enough time has passed since last announcement
            if (
                !lastAnnounced ||
                now - lastAnnounced.timestamp > DEBOUNCE_MS
            ) {
                lastAnnouncedRef.current = { type: result.type, timestamp: now };
                console.log(`[TTS] Playing alert for ${result.type}`);
                playTTSAlert(result.type, 'Primary Monitor');
                
                // Send email notification for emergencies
                sendEmailNotification(result, 'Primary Monitor');
            } else {
                const remainingTime = Math.ceil((DEBOUNCE_MS - (now - lastAnnounced.timestamp)) / 1000);
                console.log(`[TTS] Suppressed (${remainingTime}s until next announcement)`);
            }
        }
    }, [playTTSAlert, sendEmailNotification]);

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
                    <div className="lg:col-span-2 space-y-6">
                        <VideoFeed
                            location="Primary Monitor"
                            isAnalyzing={isAnalyzing}
                            setIsAnalyzing={setIsAnalyzing}
                            onEmergencyDetected={handleEmergencyDetected}
                            autoStart={true}
                            enableFaceMesh={true}
                        />
                        
                        {/* SmartSpectra Vital Signs Panel */}
                        <VitalsPanel />
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

            </main>
        </div>
    );
};

export default RealTimePage;
