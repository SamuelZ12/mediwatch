'use client';

import React from 'react';
import Link from 'next/link';

interface SidebarProps {
    activePage?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage = 'dashboard' }) => {
    const menuItems = [
        { name: 'Dashboard', href: '/', key: 'dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { name: 'Real Time', href: '/realtime', key: 'realtime', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
        { name: 'Analytics', href: '/analytics', key: 'analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { name: 'Staff Management', href: '/staff', key: 'staff', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    ];

    return (
        <aside className="fixed left-0 top-0 h-full w-20 md:w-64 bg-[#F2EDE8] border-r border-[#E5DFD9] z-50 transition-all duration-300">
            <div className="flex flex-col h-full py-6">
                <div className="px-6 mb-10 flex items-center space-x-3">
                    <div className="bg-[#E78A62] p-2 rounded-xl text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <span className="hidden md:block text-xl font-bold text-[#423E3B]">MediWatch</span>
                </div>

                <nav className="flex-1 space-y-2 px-3">
                    {menuItems.map((item) => (
                        <Link
                            key={item.key}
                            href={item.href}
                            className={`w-full flex items-center p-3 rounded-2xl group transition-all duration-200 ${activePage === item.key ? 'bg-white shadow-sm text-[#E78A62]' : 'text-[#8E867E] hover:bg-white/50'
                                }`}
                        >
                            <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                            </svg>
                            <span className="hidden md:block ml-4 text-sm font-semibold tracking-wide">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="mt-auto px-4 space-y-4">
                    <button className="w-full flex items-center p-3 rounded-2xl text-[#8E867E] hover:bg-white/50">
                        <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="hidden md:block ml-4 text-sm font-semibold tracking-wide">Settings</span>
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
