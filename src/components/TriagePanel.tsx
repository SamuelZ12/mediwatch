'use client';

import React, { useState } from 'react';
import type { TriageRecommendation, TriagePriority } from '@/types';
import RiskBadge from './ui/RiskBadge';

interface TriagePanelProps {
  recommendation: TriageRecommendation | null;
  onPatientSelect?: (patientId: string) => void;
  onAlertStaff?: (patientId: string) => void;
  isLoading?: boolean;
}

const TriagePanel: React.FC<TriagePanelProps> = ({
  recommendation,
  onPatientSelect,
  onAlertStaff,
  isLoading = false,
}) => {
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9]">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E78A62]"></div>
          <span className="ml-3 text-[#8E867E]">Analyzing patient data...</span>
        </div>
      </div>
    );
  }

  if (!recommendation || recommendation.priority_order.length === 0) {
    return (
      <div className="bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9]">
        <div className="text-center py-12 text-[#8E867E]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p>No patient data available</p>
        </div>
      </div>
    );
  }

  const toggleExpanded = (patientId: string) => {
    setExpandedPatient(prev => prev === patientId ? null : patientId);
  };

  return (
    <div className="bg-[#FFFDFB] rounded-[2rem] p-6 shadow-sm border border-[#E5DFD9]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#423E3B]">Patient Priority Queue</h2>
          <p className="text-sm text-[#8E867E]">
            Updated {recommendation.timestamp ? new Date(recommendation.timestamp).toLocaleTimeString() : 'just now'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#8E867E] uppercase">
            {recommendation.priority_order.length} Patients
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {recommendation.priority_order.map((patient, index) => (
          <PatientRow
            key={patient.patient_id}
            patient={patient}
            rank={index + 1}
            isExpanded={expandedPatient === patient.patient_id}
            onToggleExpand={() => toggleExpanded(patient.patient_id)}
            onSelect={() => onPatientSelect?.(patient.patient_id)}
            onAlertStaff={() => onAlertStaff?.(patient.patient_id)}
          />
        ))}
      </div>
    </div>
  );
};

interface PatientRowProps {
  patient: TriagePriority;
  rank: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onAlertStaff: () => void;
}

const PatientRow: React.FC<PatientRowProps> = ({
  patient,
  rank,
  isExpanded,
  onToggleExpand,
  onSelect,
  onAlertStaff,
}) => {
  const isHighRisk = patient.risk_score >= 61;
  const isCritical = patient.risk_score >= 81;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isCritical
          ? 'border-red-200 bg-red-50/50'
          : isHighRisk
          ? 'border-orange-200 bg-orange-50/30'
          : 'border-[#E5DFD9] bg-white'
      }`}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                isCritical
                  ? 'bg-red-500 text-white'
                  : isHighRisk
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#E5DFD9] text-[#423E3B]'
              }`}
            >
              {rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#423E3B]">{patient.patient_name}</h3>
                <span className="text-xs font-bold text-[#8E867E] uppercase">
                  {patient.room_code}
                </span>
              </div>
              <p className="text-sm text-[#8E867E]">{patient.primary_concern}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <RiskBadge score={patient.risk_score} showLabel size="md" />
            <svg
              className={`w-5 h-5 text-[#8E867E] transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[#E5DFD9] pt-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[#423E3B] mb-1">Recommended Action</p>
            <p className="text-sm text-[#8E867E]">{patient.action}</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
              className="flex-1 px-4 py-2 bg-[#F8F5F2] hover:bg-[#E5DFD9] text-[#423E3B] font-semibold rounded-xl transition-colors text-sm"
            >
              View Details
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAlertStaff();
              }}
              className={`flex-1 px-4 py-2 font-semibold rounded-xl transition-colors text-sm ${
                isCritical
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#E78A62] hover:bg-[#D67A52] text-white'
              }`}
            >
              Alert Staff
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriagePanel;
