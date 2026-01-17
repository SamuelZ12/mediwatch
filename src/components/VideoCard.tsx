'use client';

import { Camera } from 'lucide-react';
import type { AnalysisResult } from '@/types';

interface VideoCardProps {
  roomNumber: string;
  roomName: string;
  onEmergencyDetected: (result: AnalysisResult) => void;
}

export default function VideoCard({ roomNumber, roomName }: VideoCardProps) {
  return (
    <div className="group relative bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden hover:border-emerald-500/30 transition-all cursor-pointer">
      {/* Camera view placeholder */}
      <div className="aspect-video bg-slate-800/50 relative">
        {/* Simulated camera feed pattern */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
            <Camera className="w-8 h-8 text-slate-500" />
          </div>
        </div>

        {/* Scan line effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Live indicator */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-black/50 rounded-md">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-slate-300 font-medium">LIVE</span>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500/20 rounded-md border border-emerald-500/30">
          <span className="text-[10px] text-emerald-400 font-medium">NORMAL</span>
        </div>
      </div>

      {/* Room info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{roomName}</p>
            <p className="text-xs text-slate-500">{roomNumber}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
