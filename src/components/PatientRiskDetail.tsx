'use client';

import React from 'react';
import type { RiskPrediction, PatientSnapshot, ContributingFactor } from '@/types';
import RiskBadge from './ui/RiskBadge';

interface PatientRiskDetailProps {
  patientName: string;
  roomCode: string;
  prediction: RiskPrediction;
  snapshot?: PatientSnapshot;
  onClose?: () => void;
  onAlertStaff?: () => void;
}

const PatientRiskDetail: React.FC<PatientRiskDetailProps> = ({
  patientName,
  roomCode,
  prediction,
  snapshot,
  onClose,
  onAlertStaff,
}) => {
  const isCritical = prediction.risk_score >= 81;
  const isElevated = prediction.risk_score >= 61;

  return (
    <div className="bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold text-[#423E3B]">{patientName}</h2>
            <span className="text-sm font-bold text-[#8E867E] uppercase">{roomCode}</span>
          </div>
          <p className="text-sm text-[#8E867E]">
            Risk Assessment • Confidence: {Math.round(prediction.confidence * 100)}%
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F8F5F2] rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-[#8E867E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Risk Score Gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-[#423E3B]">Risk Score</span>
          <RiskBadge score={prediction.risk_score} showLabel size="lg" />
        </div>
        <div className="h-3 bg-[#E5DFD9] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isCritical
                ? 'bg-red-500'
                : isElevated
                ? 'bg-orange-500'
                : prediction.risk_score >= 31
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${prediction.risk_score}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-[#8E867E]">
          <span>Low</span>
          <span>Moderate</span>
          <span>Elevated</span>
          <span>High</span>
        </div>
      </div>

      {/* What Happened / Why / What Next */}
      <div className="space-y-4 mb-6">
        {/* What Happened */}
        <div className="bg-[#F8F5F2] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[#423E3B] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#E78A62]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            What Happened?
          </h3>
          <p className="text-sm text-[#8E867E]">
            {snapshot ? generateWhatHappened(snapshot, prediction) : 'Patient vitals and alert history analyzed.'}
          </p>
        </div>

        {/* Why It Matters */}
        <div className="bg-[#F8F5F2] rounded-2xl p-4">
          <h3 className="text-sm font-bold text-[#423E3B] mb-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#E78A62]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Why Does It Matter?
          </h3>
          <p className="text-sm text-[#8E867E]">
            {generateWhyItMatters(prediction)}
          </p>
        </div>

        {/* What Next */}
        <div className={`rounded-2xl p-4 ${isCritical ? 'bg-red-50' : 'bg-[#F8F5F2]'}`}>
          <h3 className="text-sm font-bold text-[#423E3B] mb-2 flex items-center gap-2">
            <svg className={`w-4 h-4 ${isCritical ? 'text-red-500' : 'text-[#E78A62]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            What Should Happen Next?
          </h3>
          <p className={`text-sm ${isCritical ? 'text-red-700 font-medium' : 'text-[#8E867E]'}`}>
            {prediction.recommended_action}
          </p>
        </div>
      </div>

      {/* Contributing Factors */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-[#423E3B] mb-3">Contributing Factors</h3>
        <div className="space-y-2">
          {prediction.contributing_factors.map((factor, index) => (
            <FactorBar key={index} factor={factor} />
          ))}
        </div>
      </div>

      {/* Vital Signs (if snapshot available) */}
      {snapshot && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-[#423E3B] mb-3">Current Vitals</h3>
          <div className="grid grid-cols-2 gap-3">
            <VitalCard
              label="Heart Rate"
              value={`${snapshot.heart_rate} BPM`}
              isAbnormal={snapshot.heart_rate < 60 || snapshot.heart_rate > 100}
            />
            <VitalCard
              label="Oxygen"
              value={`${snapshot.oxygen_saturation}%`}
              isAbnormal={snapshot.oxygen_saturation < 95}
            />
            <VitalCard
              label="Alerts (1h)"
              value={snapshot.alert_count_1h.toString()}
              isAbnormal={snapshot.alert_count_1h > 0}
            />
            <VitalCard
              label="Status"
              value={snapshot.current_status}
              isAbnormal={snapshot.current_status !== 'Normal'}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {onAlertStaff && (
        <div className="flex gap-3">
          <button
            onClick={onAlertStaff}
            className={`flex-1 py-3 font-bold rounded-xl transition-colors ${
              isCritical
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-[#E78A62] hover:bg-[#D67A52] text-white'
            }`}
          >
            Alert Staff
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-[#F8F5F2] hover:bg-[#E5DFD9] text-[#423E3B] font-bold rounded-xl transition-colors"
          >
            Acknowledge
          </button>
        </div>
      )}
    </div>
  );
};

interface FactorBarProps {
  factor: ContributingFactor;
}

const FactorBar: React.FC<FactorBarProps> = ({ factor }) => {
  const isIncreasing = factor.direction === 'increases_risk';
  const percentage = Math.round(factor.importance * 100);

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm text-[#8E867E] truncate">{factor.factor}</div>
      <div className="flex-1 h-2 bg-[#E5DFD9] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isIncreasing ? 'bg-red-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={`w-12 text-xs font-bold ${isIncreasing ? 'text-red-500' : 'text-emerald-500'}`}>
        {isIncreasing ? '+' : '-'}{percentage}%
      </div>
    </div>
  );
};

interface VitalCardProps {
  label: string;
  value: string;
  isAbnormal?: boolean;
}

const VitalCard: React.FC<VitalCardProps> = ({ label, value, isAbnormal }) => (
  <div className={`p-3 rounded-xl ${isAbnormal ? 'bg-red-50 border border-red-200' : 'bg-[#F8F5F2]'}`}>
    <p className="text-xs text-[#8E867E] font-bold uppercase mb-1">{label}</p>
    <p className={`text-lg font-bold ${isAbnormal ? 'text-red-600' : 'text-[#423E3B]'}`}>{value}</p>
  </div>
);

function generateWhatHappened(snapshot: PatientSnapshot, prediction: RiskPrediction): string {
  const issues: string[] = [];

  if (snapshot.oxygen_saturation < 95) {
    issues.push(`oxygen saturation dropped to ${snapshot.oxygen_saturation}%`);
  }
  if (snapshot.heart_rate > 100) {
    issues.push(`heart rate elevated to ${snapshot.heart_rate} BPM`);
  } else if (snapshot.heart_rate < 60) {
    issues.push(`heart rate low at ${snapshot.heart_rate} BPM`);
  }
  if (snapshot.alert_count_1h > 0) {
    issues.push(`${snapshot.alert_count_1h} alert(s) in the past hour`);
  }
  if (snapshot.current_status === 'Critical') {
    issues.push('patient status is critical');
  } else if (snapshot.current_status === 'Warning') {
    issues.push('patient status shows warning signs');
  }

  if (issues.length === 0) {
    return 'Patient vitals are within normal ranges with no recent alerts.';
  }

  return `Analysis detected: ${issues.join(', ')}.`;
}

function generateWhyItMatters(prediction: RiskPrediction): string {
  const probability = Math.round(prediction.deterioration_probability * 100);

  if (prediction.risk_score >= 81) {
    return `This pattern of vitals precedes medical emergencies in ${probability}% of similar cases. Immediate attention is strongly recommended.`;
  }
  if (prediction.risk_score >= 61) {
    return `These indicators suggest an elevated ${probability}% probability of deterioration. Proactive monitoring can prevent escalation.`;
  }
  if (prediction.risk_score >= 31) {
    return `While currently stable, this patient has a ${probability}% chance of requiring increased attention. Routine monitoring advised.`;
  }
  return `Patient shows stable vital signs with low risk indicators. Continue standard monitoring protocols.`;
}

export default PatientRiskDetail;
