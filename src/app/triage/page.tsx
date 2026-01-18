'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/Sidebar';
import TriagePanel from '../../components/TriagePanel';
import PatientRiskDetail from '../../components/PatientRiskDetail';
import RiskBadge from '../../components/ui/RiskBadge';
import type { CameraRoom, Alert, TriageRecommendation, RiskPrediction, PatientSnapshot } from '../../types';

// Simulated patient data (same as main page)
const INITIAL_ROOMS: CameraRoom[] = [
  { id: '1', name: 'James Wilson', roomCode: 'Ward-A / R101', stats: { heartRate: 72, oxygen: 98, status: 'Normal' }, isRecording: true },
  { id: '2', name: 'Kevin Durant', roomCode: 'Ward-A / R102', stats: { heartRate: 88, oxygen: 96, status: 'Normal' }, isRecording: true },
  { id: '3', name: 'Robert Chen', roomCode: 'Ward-B / R201', stats: { heartRate: 104, oxygen: 92, status: 'Warning' }, isRecording: true },
  { id: '4', name: 'Leonardo DiCaprio', roomCode: 'Ward-B / R202', stats: { heartRate: 68, oxygen: 99, status: 'Normal' }, isRecording: true },
  { id: '5', name: 'Elena Kostov', roomCode: 'ICU / R001', stats: { heartRate: 112, oxygen: 88, status: 'Critical' }, isRecording: true },
  { id: '6', name: 'David Smith', roomCode: 'ICU / R002', stats: { heartRate: 75, oxygen: 97, status: 'Normal' }, isRecording: true },
  { id: '7', name: 'Linda Miller', roomCode: 'Ward-C / R301', stats: { heartRate: 82, oxygen: 96, status: 'Normal' }, isRecording: true },
  { id: '8', name: 'Kevin Durant', roomCode: 'Ward-C / R302', stats: { heartRate: 90, oxygen: 95, status: 'Normal' }, isRecording: true },
];

// Simulated alert history
const INITIAL_ALERTS: Alert[] = [
  {
    id: 'a1',
    type: 'distress',
    confidence: 0.82,
    description: 'Elevated heart rate detected',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    location: 'ICU / R001',
    acknowledged: true,
  },
  {
    id: 'a2',
    type: 'fall',
    confidence: 0.75,
    description: 'Potential fall detected',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    location: 'Ward-B / R201',
    acknowledged: true,
  },
];

const TriagePage: React.FC = () => {
  const [rooms, setRooms] = useState<CameraRoom[]>(INITIAL_ROOMS);
  const [alerts] = useState<Alert[]>(INITIAL_ALERTS);
  const [recommendation, setRecommendation] = useState<TriageRecommendation | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<RiskPrediction | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PatientSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchTriage = useCallback(async () => {
    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms, alerts }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendation({
          ...data,
          timestamp: new Date(data.timestamp),
        });
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch triage:', error);
    } finally {
      setIsLoading(false);
    }
  }, [rooms, alerts]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchTriage();
    const interval = setInterval(fetchTriage, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTriage]);

  // Simulate vital sign changes
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms(prev => prev.map(room => ({
        ...room,
        stats: {
          ...room.stats,
          heartRate: Math.max(50, Math.min(130, room.stats.heartRate + (Math.random() > 0.5 ? 1 : -1))),
        }
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handlePatientSelect = async (patientId: string) => {
    const room = rooms.find(r => r.id === patientId);
    if (!room) return;

    setSelectedPatientId(patientId);

    // Generate local prediction for detail view
    const snapshot: PatientSnapshot = {
      patient_id: room.id,
      timestamp: new Date().toISOString(),
      heart_rate: room.stats.heartRate,
      oxygen_saturation: room.stats.oxygen,
      current_status: room.stats.status,
      alert_count_1h: alerts.filter(a => a.location === room.roomCode && new Date(a.timestamp) > new Date(Date.now() - 60 * 60 * 1000)).length,
      alert_count_24h: alerts.filter(a => a.location === room.roomCode).length,
      last_emergency_type: alerts.find(a => a.location === room.roomCode)?.type || null,
      last_emergency_confidence: alerts.find(a => a.location === room.roomCode)?.confidence || 0,
      time_since_last_alert_mins: 999,
    };

    const priority = recommendation?.priority_order.find(p => p.patient_id === patientId);
    const prediction: RiskPrediction = {
      patient_id: patientId,
      risk_score: priority?.risk_score || 0,
      deterioration_probability: (priority?.risk_score || 0) / 100 * 0.7,
      contributing_factors: generateFactors(snapshot),
      recommended_action: priority?.action || 'Continue routine monitoring',
      confidence: 0.7,
    };

    setSelectedSnapshot(snapshot);
    setSelectedPrediction(prediction);
  };

  const handleAlertStaff = (patientId: string) => {
    const room = rooms.find(r => r.id === patientId);
    if (room) {
      alert(`Alert dispatched for ${room.name} in ${room.roomCode}`);
    }
  };

  const handleCloseDetail = () => {
    setSelectedPatientId(null);
    setSelectedPrediction(null);
    setSelectedSnapshot(null);
  };

  const selectedRoom = rooms.find(r => r.id === selectedPatientId);

  // Calculate stats
  const highRiskCount = recommendation?.priority_order.filter(p => p.risk_score >= 61).length || 0;
  const criticalCount = recommendation?.priority_order.filter(p => p.risk_score >= 81).length || 0;
  const avgRiskScore = recommendation?.priority_order.length
    ? Math.round(recommendation.priority_order.reduce((sum, p) => sum + p.risk_score, 0) / recommendation.priority_order.length)
    : 0;

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="triage" />

      <main className="flex-1 ml-20 md:ml-64 p-4 md:p-8 lg:p-12">
        <header className="flex flex-col md:flex-row md:items-start justify-between mb-10 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-[#423E3B] tracking-tight mb-2">Patient Triage</h1>
            <p className="text-[#8E867E] font-medium max-w-md">
              AI-powered risk assessment and prioritization. Powered by Wood Wide AI.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchTriage}
              disabled={isLoading}
              className="px-4 py-2 bg-[#E78A62] hover:bg-[#D67A52] text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Analyzing...' : 'Refresh'}
            </button>
            <div className="text-right bg-white/50 px-4 py-2 rounded-2xl border border-[#E5DFD9]">
              <p className="text-xs font-bold text-[#8E867E] uppercase tracking-widest mb-0.5">Last Updated</p>
              <p className="text-sm font-bold text-[#423E3B]">{lastUpdated.toLocaleTimeString()}</p>
            </div>
          </div>
        </header>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Patients"
            value={rooms.length.toString()}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          <StatCard
            label="High Risk"
            value={highRiskCount.toString()}
            variant={highRiskCount > 0 ? 'warning' : 'default'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            }
          />
          <StatCard
            label="Critical"
            value={criticalCount.toString()}
            variant={criticalCount > 0 ? 'danger' : 'default'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Avg Risk Score"
            value={avgRiskScore.toString()}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            badge={<RiskBadge score={avgRiskScore} size="sm" />}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Triage Panel */}
          <div className="lg:col-span-2">
            <TriagePanel
              recommendation={recommendation}
              onPatientSelect={handlePatientSelect}
              onAlertStaff={handleAlertStaff}
              isLoading={isLoading}
            />
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPatientId && selectedPrediction && selectedRoom ? (
              <PatientRiskDetail
                patientName={selectedRoom.name}
                roomCode={selectedRoom.roomCode}
                prediction={selectedPrediction}
                snapshot={selectedSnapshot || undefined}
                onClose={handleCloseDetail}
                onAlertStaff={() => handleAlertStaff(selectedPatientId)}
              />
            ) : (
              <div className="bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9]">
                <div className="text-center py-12 text-[#8E867E]">
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <p className="font-medium">Select a patient to view details</p>
                  <p className="text-sm mt-1">Click on any patient in the priority queue</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-16 pt-8 border-t border-[#E5DFD9] flex flex-col md:flex-row justify-between items-center text-[#8E867E] text-xs font-semibold uppercase tracking-widest">
          <p>© 2026 MediWatch OS v2.1.4 - HIPAA Compliant</p>
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

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'warning' | 'danger';
  badge?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, variant = 'default', badge }) => {
  const variantStyles = {
    default: 'bg-[#FFFDFB] border-[#E5DFD9]',
    warning: 'bg-orange-50 border-orange-200',
    danger: 'bg-red-50 border-red-200',
  };

  const iconStyles = {
    default: 'text-[#E78A62]',
    warning: 'text-orange-500',
    danger: 'text-red-500',
  };

  return (
    <div className={`rounded-2xl p-4 border ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={iconStyles[variant]}>{icon}</div>
        {badge}
      </div>
      <p className="text-2xl font-black text-[#423E3B]">{value}</p>
      <p className="text-xs font-bold text-[#8E867E] uppercase">{label}</p>
    </div>
  );
};

function generateFactors(snapshot: PatientSnapshot) {
  const factors = [];

  if (snapshot.heart_rate < 50 || snapshot.heart_rate > 120) {
    factors.push({ factor: 'Heart Rate', importance: 0.9, direction: 'increases_risk' as const });
  } else if (snapshot.heart_rate < 60 || snapshot.heart_rate > 100) {
    factors.push({ factor: 'Heart Rate', importance: 0.5, direction: 'increases_risk' as const });
  } else {
    factors.push({ factor: 'Heart Rate', importance: 0.3, direction: 'decreases_risk' as const });
  }

  if (snapshot.oxygen_saturation < 92) {
    factors.push({ factor: 'Oxygen Saturation', importance: 0.95, direction: 'increases_risk' as const });
  } else if (snapshot.oxygen_saturation < 96) {
    factors.push({ factor: 'Oxygen Saturation', importance: 0.4, direction: 'increases_risk' as const });
  } else {
    factors.push({ factor: 'Oxygen Saturation', importance: 0.2, direction: 'decreases_risk' as const });
  }

  if (snapshot.alert_count_1h > 0) {
    factors.push({ factor: 'Recent Alerts', importance: Math.min(snapshot.alert_count_1h * 0.3, 0.8), direction: 'increases_risk' as const });
  }

  if (snapshot.current_status === 'Critical') {
    factors.push({ factor: 'Current Status', importance: 0.85, direction: 'increases_risk' as const });
  } else if (snapshot.current_status === 'Warning') {
    factors.push({ factor: 'Current Status', importance: 0.5, direction: 'increases_risk' as const });
  }

  return factors.sort((a, b) => b.importance - a.importance);
}

export default TriagePage;
