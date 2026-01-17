import React from 'react';
import { CameraRoom } from '../types';

interface CameraCardProps {
    room: CameraRoom;
}

const CameraCard: React.FC<CameraCardProps> = ({ room }) => {
    const isCritical = room.stats.status === 'Critical';
    const isWarning = room.stats.status === 'Warning';

    return (
        <div className="bg-[#FFFDFB] rounded-[2rem] p-4 shadow-sm border border-[#E5DFD9] hover:shadow-md transition-all duration-300 group">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#2D2A28] mb-4">
                <div className="absolute top-3 left-3 flex items-center space-x-2 z-10">
                    <span className="flex items-center space-x-1 bg-red-500/90 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>Live</span>
                    </span>
                </div>

                <div className="absolute top-3 right-3 z-10">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${isCritical ? 'bg-red-100 text-red-600 animate-pulse' :
                            isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {room.stats.status}
                    </span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <svg className="w-12 h-12 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </div>
            </div>

            <div className="flex justify-between items-start mb-3 px-1">
                <div>
                    <h3 className="text-lg font-bold text-[#423E3B] leading-tight">{room.name}</h3>
                    <p className="text-xs font-bold text-[#8E867E] tracking-wider uppercase">{room.roomCode}</p>
                </div>
                <div className="flex space-x-1">
                    <button className="p-2 bg-[#F8F5F2] hover:bg-[#FFE7D9] rounded-xl text-[#8E867E] hover:text-[#E78A62] transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F8F5F2] rounded-2xl p-3 flex items-center space-x-3 transition-colors hover:bg-white border border-transparent hover:border-[#E5DFD9]">
                    <div className={`p-1.5 rounded-lg transition-all duration-300 ${isCritical ? 'bg-red-200' : 'bg-red-100'}`}>
                        <svg className="w-3.5 h-3.5 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-[#8E867E] font-bold uppercase leading-none mb-1">BPM</p>
                        <p className="text-sm font-black text-[#423E3B]">{room.stats.heartRate}</p>
                    </div>
                </div>
                <div className="bg-[#F8F5F2] rounded-2xl p-3 flex items-center space-x-3 transition-colors hover:bg-white border border-transparent hover:border-[#E5DFD9]">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2c-4.418 0-8 3.582-8 8 0 5.25 8 12 8 12s8-6.75 8-12c0-4.418-3.582-8-8-8zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs text-[#8E867E] font-bold uppercase leading-none mb-1">SPO2</p>
                        <p className="text-sm font-black text-[#423E3B]">{room.stats.oxygen}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CameraCard;
