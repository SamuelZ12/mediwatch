'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Activity, Wind, Heart, Droplets } from 'lucide-react';
import { getSmartSpectraClient, isSmartSpectraEnabled, VitalSigns } from '@/lib/smartspectra';

interface VitalsPanelProps {
  className?: string;
  compact?: boolean;
}

interface VitalCardProps {
  label: string;
  value: number | null;
  unit: string;
  icon: React.ReactNode;
  color: string;
  warning?: boolean;
  critical?: boolean;
}

const VitalCard: React.FC<VitalCardProps> = ({ 
  label, 
  value, 
  unit, 
  icon, 
  color,
  warning,
  critical 
}) => {
  const bgColor = critical 
    ? 'bg-red-50 border-red-200' 
    : warning 
    ? 'bg-amber-50 border-amber-200' 
    : 'bg-white border-[#E5DFD9]';
  
  const textColor = critical 
    ? 'text-red-600' 
    : warning 
    ? 'text-amber-600' 
    : 'text-[#423E3B]';

  return (
    <div className={`${bgColor} rounded-2xl p-4 border transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-[#8E867E] uppercase tracking-wider">{label}</span>
        <div className={`p-1.5 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-black ${textColor}`}>
          {value !== null ? Math.round(value) : '--'}
        </span>
        <span className="text-sm font-medium text-[#8E867E]">{unit}</span>
      </div>
    </div>
  );
};

const VitalsPanel: React.FC<VitalsPanelProps> = ({ className = '', compact = false }) => {
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [connected, setConnected] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  const [enabled] = useState(isSmartSpectraEnabled());

  const updateVitals = useCallback((newVitals: VitalSigns) => {
    setVitals(newVitals);
  }, []);

  const updateStatus = useCallback((status: { connected: boolean; message: string }) => {
    setConnected(status.connected);
    setStatusMessage(status.message);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatusMessage('SmartSpectra disabled');
      return;
    }

    const client = getSmartSpectraClient();
    
    // Subscribe to updates
    const unsubVitals = client.onVitals(updateVitals);
    const unsubStatus = client.onStatus(updateStatus);
    
    // Connect to gateway
    client.connect();

    return () => {
      unsubVitals();
      unsubStatus();
    };
  }, [enabled, updateVitals, updateStatus]);

  // Determine warning/critical states
  const heartRateWarning = vitals != null && vitals.heartRate != null && (vitals.heartRate < 50 || vitals.heartRate > 100);
  const heartRateCritical = vitals != null && vitals.heartRate != null && (vitals.heartRate < 40 || vitals.heartRate > 120);
  const spo2Warning = vitals != null && vitals.spo2 != null && vitals.spo2 < 95;
  const spo2Critical = vitals != null && vitals.spo2 != null && vitals.spo2 < 90;
  const breathingWarning = vitals != null && vitals.breathingRate != null && (vitals.breathingRate < 10 || vitals.breathingRate > 20);
  const breathingCritical = vitals != null && vitals.breathingRate != null && (vitals.breathingRate < 8 || vitals.breathingRate > 25);

  if (compact) {
    return (
      <div className={`flex items-center gap-4 ${className}`}>
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-[#423E3B]">
            {vitals?.heartRate !== null ? Math.round(vitals.heartRate) : '--'} BPM
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-bold text-[#423E3B]">
            {vitals?.breathingRate !== null ? Math.round(vitals.breathingRate) : '--'} /min
          </span>
        </div>
        {connected && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-600 font-medium">Live</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9] ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-[#423E3B]">Vital Signs</h3>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-600 font-medium">SmartSpectra Live</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs text-amber-600 font-medium">{statusMessage}</span>
            </>
          )}
        </div>
      </div>

      {!enabled ? (
        <div className="text-center py-8 text-[#8E867E]">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium">SmartSpectra Integration Disabled</p>
          <p className="text-sm mt-1">Enable in environment variables</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <VitalCard
            label="Heart Rate"
            value={vitals?.heartRate ?? null}
            unit="BPM"
            icon={<Heart className="w-4 h-4 text-red-500" />}
            color="bg-red-100"
            warning={heartRateWarning}
            critical={heartRateCritical}
          />
          <VitalCard
            label="SpO2"
            value={vitals?.spo2 ?? null}
            unit="%"
            icon={<Droplets className="w-4 h-4 text-blue-500" />}
            color="bg-blue-100"
            warning={spo2Warning}
            critical={spo2Critical}
          />
          <VitalCard
            label="Breathing"
            value={vitals?.breathingRate ?? null}
            unit="/min"
            icon={<Wind className="w-4 h-4 text-cyan-500" />}
            color="bg-cyan-100"
            warning={breathingWarning}
            critical={breathingCritical}
          />
          <VitalCard
            label="HRV"
            value={vitals?.hrv ?? null}
            unit="ms"
            icon={<Activity className="w-4 h-4 text-purple-500" />}
            color="bg-purple-100"
          />
        </div>
      )}

      {vitals && (
        <div className="mt-4 pt-4 border-t border-[#E5DFD9] flex items-center justify-between text-xs text-[#8E867E]">
          <span>Signal Quality: {Math.round(vitals.confidence * 100)}%</span>
          <span>Updated: {vitals.timestamp.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default VitalsPanel;
