'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Clock, Target, Activity, RefreshCw } from 'lucide-react';

interface Stats {
  totalTraces: number;
  avgLatency: number;
  avgConfidence: number;
  emergencyRate: number;
}

export default function ObservabilityPanel() {
  const [stats, setStats] = useState<Stats>({
    totalTraces: 0,
    avgLatency: 0,
    avgConfidence: 0,
    emergencyRate: 0,
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          AI Observability
        </h3>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Total Analyses */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Activity className="w-3 h-3" />
            Analyses
          </div>
          <div className="text-xl font-bold text-white">{stats.totalTraces}</div>
        </div>

        {/* Avg Latency */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Clock className="w-3 h-3" />
            Avg Latency
          </div>
          <div className="text-xl font-bold text-white">{stats.avgLatency.toFixed(0)}ms</div>
        </div>

        {/* Avg Confidence */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <Target className="w-3 h-3" />
            Confidence
          </div>
          <div className="text-xl font-bold text-white">
            {(stats.avgConfidence * 100).toFixed(1)}%
          </div>
        </div>

        {/* Emergency Rate */}
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
            <BarChart3 className="w-3 h-3" />
            Alert Rate
          </div>
          <div className="text-xl font-bold text-white">
            {(stats.emergencyRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Arize badge */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-center">
        <span className="text-xs text-gray-500">
          Powered by <span className="text-purple-400 font-medium">Arize Phoenix</span>
        </span>
      </div>
    </div>
  );
}
