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
  distress: 'bg-yellow-500',
  normal: 'bg-green-500',
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
      <div className="bg-gray-800 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-200">No Alerts</h3>
        <p className="text-gray-400 text-sm mt-1">
          All monitored areas are normal
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-xl overflow-hidden transition-all ${
            alert.acknowledged ? 'bg-gray-800' : 'bg-gray-800 ring-2 ring-red-500'
          }`}
        >
          {/* Header */}
          <div
            className="p-4 cursor-pointer"
            onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${
                    TYPE_COLORS[alert.type]
                  } flex items-center justify-center text-xl`}
                >
                  {TYPE_ICONS[alert.type]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white uppercase">
                      {alert.type}
                    </span>
                    {!alert.acknowledged && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-3 h-3" />
                    {alert.location}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">
                  {Math.round(alert.confidence * 100)}%
                </span>
                {expandedId === alert.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Expanded content */}
          {expandedId === alert.id && (
            <div className="px-4 pb-4 border-t border-gray-700 pt-3">
              <p className="text-gray-300 text-sm mb-3">{alert.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Clock className="w-3 h-3" />
                {format(new Date(alert.timestamp), 'PPpp')}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayAudio(alert);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition"
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
                    className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition"
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
