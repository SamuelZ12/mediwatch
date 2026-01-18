'use client';

import React, { useRef, useEffect } from 'react';

interface SimulatedCameraFeedProps {
  roomId: string;
  patientName: string;
  roomCode: string;
  status: 'Normal' | 'Warning' | 'Critical';
}

// Seeded random number generator for deterministic room variations
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return () => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return hash / 0x7fffffff;
  };
}

interface RoomConfig {
  bedX: number;
  bedY: number;
  hasIVStand: boolean;
  hasWindow: boolean;
  windowSide: 'left' | 'right';
  tintColor: string;
  patientPosition: 'left' | 'center' | 'right';
}

function generateRoomConfig(roomId: string): RoomConfig {
  const rand = seededRandom(roomId);

  const tintColors = [
    'rgba(100, 120, 140, 0.15)',
    'rgba(80, 100, 80, 0.15)',
    'rgba(120, 100, 90, 0.15)',
    'rgba(90, 90, 120, 0.15)',
  ];

  return {
    bedX: 0.25 + rand() * 0.15,
    bedY: 0.45 + rand() * 0.1,
    hasIVStand: rand() > 0.3,
    hasWindow: rand() > 0.4,
    windowSide: rand() > 0.5 ? 'left' : 'right',
    tintColor: tintColors[Math.floor(rand() * tintColors.length)],
    patientPosition: ['left', 'center', 'right'][Math.floor(rand() * 3)] as 'left' | 'center' | 'right',
  };
}

const SimulatedCameraFeed: React.FC<SimulatedCameraFeedProps> = ({
  roomId,
  patientName,
  roomCode,
  status,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const roomConfig = useRef<RoomConfig>(generateRoomConfig(roomId));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render at lower resolution for performance
    const width = 320;
    const height = 180;
    canvas.width = width;
    canvas.height = height;

    const config = roomConfig.current;
    const FPS = 15;
    const frameInterval = 1000 / FPS;

    let scanLineOffset = 0;

    function drawRoomBackground(ctx: CanvasRenderingContext2D) {
      // Dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#1a1816');
      gradient.addColorStop(0.5, '#252220');
      gradient.addColorStop(1, '#1a1816');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Room tint overlay
      ctx.fillStyle = config.tintColor;
      ctx.fillRect(0, 0, width, height);

      // Vignette effect
      const vignetteGradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) * 0.7
      );
      vignetteGradient.addColorStop(0, 'transparent');
      vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
      ctx.fillStyle = vignetteGradient;
      ctx.fillRect(0, 0, width, height);

      // Floor line
      ctx.strokeStyle = 'rgba(60, 55, 50, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.75);
      ctx.lineTo(width, height * 0.72);
      ctx.stroke();

      // Wall corner shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width * 0.15, height * 0.1);
      ctx.lineTo(width * 0.15, height * 0.75);
      ctx.lineTo(0, height * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    function drawWindow(ctx: CanvasRenderingContext2D) {
      if (!config.hasWindow) return;

      const windowX = config.windowSide === 'left' ? width * 0.05 : width * 0.75;
      const windowY = height * 0.1;
      const windowW = width * 0.2;
      const windowH = height * 0.35;

      // Window frame
      ctx.fillStyle = 'rgba(40, 50, 60, 0.8)';
      ctx.fillRect(windowX - 2, windowY - 2, windowW + 4, windowH + 4);

      // Window light
      const windowGradient = ctx.createLinearGradient(windowX, windowY, windowX, windowY + windowH);
      windowGradient.addColorStop(0, 'rgba(100, 130, 160, 0.3)');
      windowGradient.addColorStop(1, 'rgba(60, 80, 100, 0.2)');
      ctx.fillStyle = windowGradient;
      ctx.fillRect(windowX, windowY, windowW, windowH);

      // Window divider
      ctx.strokeStyle = 'rgba(50, 55, 60, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(windowX + windowW / 2, windowY);
      ctx.lineTo(windowX + windowW / 2, windowY + windowH);
      ctx.stroke();
    }

    function drawBed(ctx: CanvasRenderingContext2D) {
      const bedX = width * config.bedX;
      const bedY = height * config.bedY;
      const bedW = width * 0.5;
      const bedH = height * 0.35;

      // Bed frame
      ctx.fillStyle = '#3a3632';
      ctx.fillRect(bedX, bedY + bedH - 8, bedW, 8);

      // Bed legs
      ctx.fillStyle = '#2a2826';
      ctx.fillRect(bedX + 5, bedY + bedH, 8, 12);
      ctx.fillRect(bedX + bedW - 13, bedY + bedH, 8, 12);

      // Mattress
      ctx.fillStyle = '#4a4642';
      ctx.fillRect(bedX + 2, bedY + 5, bedW - 4, bedH - 15);

      // Mattress highlight
      ctx.fillStyle = '#555048';
      ctx.fillRect(bedX + 4, bedY + 7, bedW - 8, 3);

      // Pillow
      ctx.fillStyle = '#5a5550';
      ctx.fillRect(bedX + 5, bedY + 8, bedW * 0.25, bedH * 0.35);
      ctx.fillStyle = '#656058';
      ctx.fillRect(bedX + 7, bedY + 10, bedW * 0.25 - 4, 3);

      // Blanket
      ctx.fillStyle = '#3d4a52';
      ctx.fillRect(bedX + bedW * 0.3, bedY + 12, bedW * 0.65, bedH - 25);
    }

    function drawPatient(ctx: CanvasRenderingContext2D, breathOffset: number) {
      const bedX = width * config.bedX;
      const bedY = height * config.bedY;
      const bedW = width * 0.5;

      // Patient silhouette - head
      ctx.fillStyle = '#2a2826';
      ctx.beginPath();
      ctx.ellipse(
        bedX + bedW * 0.15,
        bedY + 20,
        12,
        10,
        0, 0, Math.PI * 2
      );
      ctx.fill();

      // Patient body under blanket (with breathing animation)
      ctx.fillStyle = '#455560';
      ctx.beginPath();
      ctx.moveTo(bedX + bedW * 0.25, bedY + 15);
      ctx.quadraticCurveTo(
        bedX + bedW * 0.45,
        bedY + 5 - breathOffset * 4,
        bedX + bedW * 0.65,
        bedY + 18
      );
      ctx.lineTo(bedX + bedW * 0.65, bedY + 35);
      ctx.lineTo(bedX + bedW * 0.25, bedY + 35);
      ctx.closePath();
      ctx.fill();
    }

    function drawIVStand(ctx: CanvasRenderingContext2D) {
      if (!config.hasIVStand) return;

      const bedX = width * config.bedX;
      const bedY = height * config.bedY;

      const ivX = bedX - 25;
      const ivY = bedY - 20;

      // Stand pole
      ctx.strokeStyle = '#555048';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ivX, ivY + 80);
      ctx.lineTo(ivX, ivY);
      ctx.stroke();

      // Bag hook
      ctx.beginPath();
      ctx.moveTo(ivX - 8, ivY);
      ctx.lineTo(ivX + 8, ivY);
      ctx.stroke();

      // IV bag
      ctx.fillStyle = 'rgba(80, 100, 120, 0.6)';
      ctx.fillRect(ivX - 5, ivY + 3, 10, 18);

      // Drip line
      ctx.strokeStyle = 'rgba(80, 100, 120, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(ivX, ivY + 21);
      ctx.quadraticCurveTo(ivX + 15, ivY + 45, bedX + 20, bedY + 30);
      ctx.stroke();

      // Base
      ctx.fillStyle = '#444038';
      ctx.beginPath();
      ctx.moveTo(ivX - 12, ivY + 80);
      ctx.lineTo(ivX + 12, ivY + 80);
      ctx.lineTo(ivX + 8, ivY + 85);
      ctx.lineTo(ivX - 8, ivY + 85);
      ctx.closePath();
      ctx.fill();
    }

    function drawScanLines(ctx: CanvasRenderingContext2D, offset: number) {
      // Static scan lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Moving scan bar
      const scanY = (offset * 2) % (height + 20) - 10;
      const scanGradient = ctx.createLinearGradient(0, scanY - 10, 0, scanY + 10);
      scanGradient.addColorStop(0, 'transparent');
      scanGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      scanGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanY - 10, width, 20);

      // Subtle noise
      for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const alpha = Math.random() * 0.03;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    function drawOverlays(ctx: CanvasRenderingContext2D) {
      const now = new Date();
      const timestamp = now.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }) + ' ' + now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Timestamp background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(width - 110, height - 18, 105, 14);

      // Timestamp text
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(timestamp, width - 8, height - 7);

      // Camera ID
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(5, height - 18, 60, 14);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(`CAM ${roomCode}`, 8, height - 7);

      // REC indicator dot
      ctx.fillStyle = '#ff3b30';
      ctx.beginPath();
      ctx.arc(15, 15, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawStatusEffect(ctx: CanvasRenderingContext2D, time: number) {
      if (status === 'Critical') {
        const pulse = Math.sin(time / 300) * 0.3 + 0.4;
        ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
      } else if (status === 'Warning') {
        ctx.fillStyle = 'rgba(255, 180, 0, 0.08)';
        ctx.fillRect(0, 0, width, height);
      }
    }

    function render(currentTime: number) {
      if (!ctx) return;

      if (currentTime - lastFrameTime.current < frameInterval) {
        animationRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime.current = currentTime;

      // Breathing cycle (~3 seconds)
      const breathOffset = Math.sin(currentTime / 1500) * 0.5 + 0.5;
      scanLineOffset = (scanLineOffset + 1) % (height + 20);

      // Clear and draw
      ctx.clearRect(0, 0, width, height);

      drawRoomBackground(ctx);
      drawWindow(ctx);
      drawIVStand(ctx);
      drawBed(ctx);
      drawPatient(ctx, breathOffset);
      drawScanLines(ctx, scanLineOffset);
      drawOverlays(ctx);
      drawStatusEffect(ctx, currentTime);

      animationRef.current = requestAnimationFrame(render);
    }

    // Start animation
    animationRef.current = requestAnimationFrame(render);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [roomId, roomCode, status]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full object-cover"
      style={{ imageRendering: 'auto' }}
    />
  );
};

export default SimulatedCameraFeed;
