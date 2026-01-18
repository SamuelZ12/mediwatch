import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CameraRoom } from '../types';
import RiskBadge from './ui/RiskBadge';
import SimulatedCameraFeed from './SimulatedCameraFeed';

interface CameraCardProps {
    room: CameraRoom;
    riskScore?: number;
}

// Simulated YOLO detection boxes for demo
const getSimulatedBoxes = (roomId: string, status: string) => {
    // Each room has different simulated person positions
    const boxConfigs: Record<string, Array<{x: number, y: number, w: number, h: number}>> = {
        '1': [{x: 0.3, y: 0.25, w: 0.35, h: 0.6}],
        '2': [{x: 0.25, y: 0.2, w: 0.4, h: 0.65}],
        '3': [{x: 0.35, y: 0.15, w: 0.3, h: 0.7}],
        '4': [{x: 0.2, y: 0.3, w: 0.45, h: 0.55}],
        '5': [{x: 0.3, y: 0.2, w: 0.35, h: 0.65}],
        '6': [{x: 0.25, y: 0.25, w: 0.4, h: 0.6}],
        '7': [{x: 0.35, y: 0.2, w: 0.3, h: 0.65}],
        '8': [{x: 0.28, y: 0.22, w: 0.38, h: 0.6}],
    };
    return boxConfigs[roomId] || [{x: 0.3, y: 0.25, w: 0.35, h: 0.6}];
};

const CameraCard: React.FC<CameraCardProps> = ({ room, riskScore }) => {
    const [videoError, setVideoError] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const isCritical = room.stats.status === 'Critical';
    const isWarning = room.stats.status === 'Warning';
    const displayRiskScore = riskScore ?? room.riskScore;

    // Draw YOLO-style bounding boxes
    const drawBoundingBoxes = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = container.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const boxes = getSimulatedBoxes(room.id, room.stats.status);
        const boxColor = isCritical ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

        boxes.forEach((box) => {
            const x = box.x * canvas.width;
            const y = box.y * canvas.height;
            const width = box.w * canvas.width;
            const height = box.h * canvas.height;

            // Draw corner brackets (YOLO style)
            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            
            const cornerLength = Math.min(width, height) * 0.15;
            
            // Top-left
            ctx.beginPath();
            ctx.moveTo(x, y + cornerLength);
            ctx.lineTo(x, y);
            ctx.lineTo(x + cornerLength, y);
            ctx.stroke();
            
            // Top-right
            ctx.beginPath();
            ctx.moveTo(x + width - cornerLength, y);
            ctx.lineTo(x + width, y);
            ctx.lineTo(x + width, y + cornerLength);
            ctx.stroke();
            
            // Bottom-left
            ctx.beginPath();
            ctx.moveTo(x, y + height - cornerLength);
            ctx.lineTo(x, y + height);
            ctx.lineTo(x + cornerLength, y + height);
            ctx.stroke();
            
            // Bottom-right
            ctx.beginPath();
            ctx.moveTo(x + width - cornerLength, y + height);
            ctx.lineTo(x + width, y + height);
            ctx.lineTo(x + width, y + height - cornerLength);
            ctx.stroke();

            // Draw label
            ctx.font = 'bold 10px Inter, sans-serif';
            const label = 'Person';
            const confidence = isCritical ? '87%' : isWarning ? '92%' : '95%';
            const labelText = `${label} ${confidence}`;
            const textWidth = ctx.measureText(labelText).width;
            
            // Background for label
            ctx.fillStyle = boxColor;
            ctx.fillRect(x, y - 16, textWidth + 8, 14);
            
            // Label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(labelText, x + 4, y - 5);
        });

        animationRef.current = requestAnimationFrame(drawBoundingBoxes);
    }, [room.id, room.stats.status, isCritical, isWarning]);

    useEffect(() => {
        drawBoundingBoxes();
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [drawBoundingBoxes]);

    return (
        <div className="bg-[#FFFDFB] rounded-[2rem] p-4 shadow-sm border border-[#E5DFD9] hover:shadow-md transition-all duration-300 group">
            <div ref={containerRef} className="relative aspect-video rounded-2xl overflow-hidden bg-[#2D2A28] mb-4">
                <div className="absolute top-3 left-3 flex items-center space-x-2 z-20">
                    <span className="flex items-center space-x-1 bg-red-500/90 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span>Live</span>
                    </span>
                    {displayRiskScore !== undefined && (
                        <RiskBadge score={displayRiskScore} size="sm" />
                    )}
                </div>

                <div className="absolute top-3 right-3 z-20">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${isCritical ? 'bg-red-100 text-red-600 animate-pulse' :
                            isWarning ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                        {room.stats.status}
                    </span>
                </div>

                {videoError ? (
                    <SimulatedCameraFeed
                        roomId={room.id}
                        patientName={room.name}
                        roomCode={room.roomCode}
                        status={room.stats.status}
                    />
                ) : (
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        src={`/videos/rooms/room-${room.id}.mp4`}
                        onError={() => setVideoError(true)}
                    />
                )}

                {/* YOLO Bounding Box Overlay */}
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none z-10"
                />
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
