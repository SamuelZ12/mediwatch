'use client';

import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Alert } from '@/types';

interface StatsPanelProps {
  alerts: Alert[];
  isMonitoring: boolean;
}

export default function StatsPanel({ alerts, isMonitoring }: StatsPanelProps) {
  const totalAlerts = alerts.length;
  const unacknowledged = alerts.filter((a) => !a.acknowledged).length;
  const acknowledged = alerts.filter((a) => a.acknowledged).length;

  const alertsByType = alerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Monitoring Status */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <Activity className="w-4 h-4" />
          Status
        </div>
        <div className={`text-xl font-bold ${isMonitoring ? 'text-green-400' : 'text-gray-500'}`}>
          {isMonitoring ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Total Alerts */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <AlertTriangle className="w-4 h-4" />
          Total Alerts
        </div>
        <div className="text-xl font-bold text-white">{totalAlerts}</div>
      </div>

      {/* Pending */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <Clock className="w-4 h-4" />
          Pending
        </div>
        <div className={`text-xl font-bold ${unacknowledged > 0 ? 'text-red-400' : 'text-white'}`}>
          {unacknowledged}
        </div>
      </div>

      {/* Acknowledged */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
          <CheckCircle className="w-4 h-4" />
          Acknowledged
        </div>
        <div className="text-xl font-bold text-green-400">{acknowledged}</div>
      </div>

      {/* Alert breakdown by type */}
      {Object.keys(alertsByType).length > 0 && (
        <div className="col-span-2 md:col-span-4 bg-gray-800 rounded-xl p-4">
          <h3 className="text-gray-400 text-sm mb-3">Alerts by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(alertsByType).map(([type, count]) => (
              <div
                key={type}
                className="px-3 py-1.5 bg-gray-700 rounded-full text-sm text-white"
              >
                <span className="capitalize">{type}</span>:{' '}
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
