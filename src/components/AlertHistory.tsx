'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Alert } from '@/types';

interface AlertHistoryProps {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onPlayAudio: (alert: Alert) => void;
}

const TYPE_COLORS: Record<string, string> = {
  fall: 'bg-orange-500',
  choking: 'bg-red-600',
  seizure: 'bg-purple-600',
  unconscious: 'bg-red-500',
  distress: 'bg-amber-500',
  normal: 'bg-emerald-500',
};

const TYPE_ICONS: Record<string, string> = {
  fall: '🔻',
  choking: '😵',
  seizure: '⚡',
  unconscious: '💤',
  distress: '😰',
  normal: '✅',
};

export default function AlertHistory({
  alerts,
  onAcknowledge,
  onPlayAudio,
}: AlertHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (alerts.length === 0) {
    return (
      <div className="bg-[#FFFDFB] rounded-[2rem] p-6 text-center border border-[#E5DFD9] shadow-sm">
        <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-[#423E3B]">No Alerts</h3>
        <p className="text-[#8E867E] text-sm mt-1">
          All monitored areas are normal
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-bold text-[#8E867E] uppercase tracking-widest">Alert History</h3>
        <span className="bg-[#E78A62] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {alerts.filter(a => !a.acknowledged).length} NEW
        </span>
      </div>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`bg-[#FFFDFB] rounded-[1.5rem] overflow-hidden transition-all border shadow-sm ${
            alert.acknowledged ? 'border-[#E5DFD9]' : 'border-red-300 ring-2 ring-red-100'
          }`}
        >
          {/* Header */}
          <div
            className="p-4 cursor-pointer hover:bg-[#F8F5F2] transition-colors"
            onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${
                    TYPE_COLORS[alert.type]
                  } flex items-center justify-center text-xl`}
                >
                  {TYPE_ICONS[alert.type]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#423E3B] uppercase text-sm">
                      {alert.type}
                    </span>
                    {!alert.acknowledged && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#8E867E]">
                    <MapPin className="w-3 h-3" />
                    {alert.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8E867E] text-xs font-medium">
                  {Math.round(alert.confidence * 100)}%
                </span>
                {expandedId === alert.id ? (
                  <ChevronUp className="w-5 h-5 text-[#8E867E]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#8E867E]" />
                )}
              </div>
            </div>
          </div>

          {/* Expanded content */}
          {expandedId === alert.id && (
            <div className="px-4 pb-4 border-t border-[#E5DFD9] pt-3">
              <p className="text-[#423E3B] text-sm mb-3">{alert.description}</p>
              <div className="flex items-center gap-2 text-xs text-[#8E867E] mb-4">
                <Clock className="w-3 h-3" />
                {format(new Date(alert.timestamp), 'PPpp')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAudio(alert);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-[#F8F5F2] hover:bg-[#E5DFD9] text-[#423E3B] rounded-xl text-sm font-semibold transition-colors border border-[#E5DFD9]"
                >
                  <Volume2 className="w-4 h-4" />
                  Play Alert
                </button>
                {!alert.acknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcknowledge(alert.id);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
