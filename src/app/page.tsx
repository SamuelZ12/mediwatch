'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import CameraCard from '../components/CameraCard';
import { CameraRoom } from '../types';

const INITIAL_ROOMS: CameraRoom[] = [
  { id: '1', name: 'James Wilson', roomCode: 'Ward-A / R101', stats: { heartRate: 72, oxygen: 98, status: 'Normal' }, isRecording: true },
  { id: '2', name: 'Sarah Parker', roomCode: 'Ward-A / R102', stats: { heartRate: 88, oxygen: 96, status: 'Normal' }, isRecording: true },
  { id: '3', name: 'Robert Chen', roomCode: 'Ward-B / R201', stats: { heartRate: 104, oxygen: 92, status: 'Warning' }, isRecording: true },
  { id: '4', name: 'Maria Garcia', roomCode: 'Ward-B / R202', stats: { heartRate: 68, oxygen: 99, status: 'Normal' }, isRecording: true },
  { id: '5', name: 'Elena Kostov', roomCode: 'ICU / R001', stats: { heartRate: 112, oxygen: 88, status: 'Critical' }, isRecording: true },
  { id: '6', name: 'David Smith', roomCode: 'ICU / R002', stats: { heartRate: 75, oxygen: 97, status: 'Normal' }, isRecording: true },
  { id: '7', name: 'Linda Miller', roomCode: 'Ward-C / R301', stats: { heartRate: 82, oxygen: 96, status: 'Normal' }, isRecording: true },
  { id: '8', name: 'Kevin Durant', roomCode: 'Ward-C / R302', stats: { heartRate: 90, oxygen: 95, status: 'Normal' }, isRecording: true },
];

const App: React.FC = () => {
  const [rooms, setRooms] = useState<CameraRoom[]>(INITIAL_ROOMS);
  const [uptime, setUptime] = useState('00:00:00');

  useEffect(() => {
    const startTime = Date.now();
    const uptimeInterval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime) / 1000);
      const h = Math.floor(diff / 3600).toString().padStart(2, '0');
      const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
      const s = (diff % 60).toString().padStart(2, '0');
      setUptime(`${h}:${m}:${s}`);
    }, 1000);

    const dataInterval = setInterval(() => {
      setRooms(prev => prev.map(room => ({
        ...room,
        stats: {
          ...room.stats,
          heartRate: room.stats.heartRate + (Math.random() > 0.5 ? 1 : -1)
        }
      })));
    }, 3000);

    return () => {
      clearInterval(uptimeInterval);
      clearInterval(dataInterval);
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar activePage="dashboard" />

      <main className="flex-1 ml-20 md:ml-64 p-4 md:p-8 lg:p-12">
        <header className="flex flex-col md:flex-row md:items-start justify-between mb-10 space-y-4 md:space-y-0">
          <div>
            <h1 className="text-4xl font-black text-[#423E3B] tracking-tight mb-2">Facility Overview</h1>
            <p className="text-[#8E867E] font-medium max-w-md">
              Monitoring active medical units. All telemetry data is synced in real-time.
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-right bg-white/50 px-4 py-2 rounded-2xl border border-[#E5DFD9]">
              <p className="text-xs font-bold text-[#A85834] uppercase tracking-widest mb-0.5">Uptime Status</p>
              <p className="text-xl font-mono font-bold text-[#423E3B]">{uptime}</p>
            </div>
            <button className="relative p-2 text-[#8E867E] hover:text-[#423E3B] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v1m6 0H9" />
              </svg>
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E78A62] rounded-full border-2 border-[#F8F5F2]"></span>
            </button>
          </div>
        </header>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <span className="text-xs font-bold text-[#8E867E] uppercase tracking-widest">Active Feeds: {rooms.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 bg-white rounded-xl border border-[#E5DFD9] text-[#8E867E] hover:bg-[#F2EDE8] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <button className="p-2 bg-white rounded-xl border border-[#E5DFD9] text-[#423E3B] hover:bg-[#F2EDE8] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <CameraCard key={room.id} room={room} />
          ))}
        </div>

        <footer className="mt-16 pt-8 border-t border-[#E5DFD9] flex flex-col md:flex-row justify-between items-center text-[#8E867E] text-xs font-semibold uppercase tracking-widest">
          <p>© 2026 MediWatch OS v2.1.4 - HIPAA Compliant</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-[#E78A62] transition-colors">Support</a>
            <a href="#" className="hover:text-[#E78A62] transition-colors">Security</a>
            <a href="#" className="hover:text-[#E78A62] transition-colors">API</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;
