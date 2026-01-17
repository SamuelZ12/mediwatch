'use client';

import React, { useState, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import VideoFeed from '../../components/VideoFeed';
import AlertHistory from '../../components/AlertHistory';
import { AnalysisResult, Alert } from '../../types';

const RealTimePage: React.FC = () => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [alerts, setAlerts] = useState<Alert[]>([]);

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
    }, []);

    const handleAcknowledge = useCallback((alertId: string) => {
        setAlerts(prev =>
            prev.map(alert =>
                alert.id === alertId ? { ...alert, acknowledged: true } : alert
            )
        );
    }, []);

    const handlePlayAudio = useCallback((alert: Alert) => {
        const message = `${alert.type} detected at ${alert.location}. ${alert.description}`;
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }
    }, []);

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
