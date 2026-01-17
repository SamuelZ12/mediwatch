'use client';

import { useState, useCallback } from 'react';
import { Mic, MicOff, Phone, PhoneOff, MessageSquare, Volume2 } from 'lucide-react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
  useRoomContext,
  useConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { ConnectionState } from 'livekit-client';
import type { Alert } from '@/types';

interface VoiceAgentProps {
  recentAlert: Alert | null;
  onVoiceCommand: (command: string) => void;
}

export default function VoiceAgent({ recentAlert, onVoiceCommand }: VoiceAgentProps) {
  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError('');

    try {
      const response = await fetch('/api/livekit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: 'mediwatch-room',
          participantName: `user-${Date.now()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get token');
      }

      const { token } = await response.json();
      setToken(token);
    } catch (err) {
      setError('Failed to connect to voice assistant');
      console.error('Connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setToken('');
  }, []);

  if (!livekitUrl) {
    return (
      <div className="bg-[#FFFDFB] rounded-xl p-4 border border-[#E5DFD9] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-[#423E3B]">
            <MessageSquare className="w-5 h-5 text-[#E78A62]" />
            Voice Assistant
          </h3>
        </div>
        <div className="text-center py-8 text-[#8E867E]">
          <p className="text-sm">LiveKit URL not configured</p>
          <p className="text-xs mt-1">Set NEXT_PUBLIC_LIVEKIT_URL in .env.local</p>
        </div>
      </div>
    );
  }

  if (token) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={livekitUrl}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={disconnect}
        className="bg-[#FFFDFB] rounded-xl p-4 border border-[#E5DFD9] shadow-sm"
      >
        <VoiceAssistantUI
          recentAlert={recentAlert}
          onVoiceCommand={onVoiceCommand}
          onDisconnect={disconnect}
        />
        <RoomAudioRenderer />
      </LiveKitRoom>
    );
  }

  return (
    <div className="bg-[#FFFDFB] rounded-xl p-4 border border-[#E5DFD9] shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-[#423E3B]">
          <MessageSquare className="w-5 h-5 text-[#E78A62]" />
          Voice Assistant
        </h3>
        <span className="px-2 py-0.5 rounded text-xs bg-[#E5DFD9] text-[#8E867E]">
          Disconnected
        </span>
      </div>

      <div className="h-48 flex items-center justify-center bg-[#F2EDE8] rounded-lg mb-4">
        <p className="text-[#8E867E] text-sm text-center">
          Connect to start voice interaction
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/20 text-red-600 text-sm rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={connect}
        disabled={isConnecting}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4" />
            Connect
          </>
        )}
      </button>

      <div className="mt-3 pt-3 border-t border-[#E5DFD9] text-center">
        <span className="text-xs text-[#8E867E]">
          Powered by <span className="text-[#E78A62] font-medium">LiveKit</span>
        </span>
      </div>
    </div>
  );
}

interface VoiceAssistantUIProps {
  recentAlert: Alert | null;
  onVoiceCommand: (command: string) => void;
  onDisconnect: () => void;
}

function VoiceAssistantUI({ recentAlert, onVoiceCommand, onDisconnect }: VoiceAssistantUIProps) {
  const { state, audioTrack, agentTranscriptions } = useVoiceAssistant();
  const connectionState = useConnectionState();
  const room = useRoomContext();

  const isConnected = connectionState === ConnectionState.Connected;
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';

  // Get recent transcriptions for display
  const recentMessages = agentTranscriptions.slice(-5).map((t, i) => ({
    role: 'agent' as const,
    text: t.text,
    key: i,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-[#423E3B]">
          <MessageSquare className="w-5 h-5 text-[#E78A62]" />
          Voice Assistant
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs ${
            isConnected
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-600'
          }`}>
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
          {isListening && (
            <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-600 animate-pulse">
              Listening
            </span>
          )}
          {isSpeaking && (
            <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-600 animate-pulse">
              Speaking
            </span>
          )}
        </div>
      </div>

      {/* Audio Visualizer */}
      <div className="h-32 bg-[#F2EDE8] rounded-lg mb-4 flex items-center justify-center overflow-hidden">
        {audioTrack ? (
          <BarVisualizer
            state={state}
            trackRef={audioTrack}
            barCount={24}
            className="w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-[#8E867E]">
            <Volume2 className="w-8 h-8" />
            <span className="text-sm">Waiting for agent...</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="h-24 overflow-y-auto mb-4 space-y-2 bg-[#F2EDE8] rounded-lg p-3">
        {recentMessages.length === 0 ? (
          <p className="text-[#8E867E] text-sm text-center">
            Speak to interact with MediWatch
          </p>
        ) : (
          recentMessages.map((msg) => (
            <div
              key={msg.key}
              className="p-2 rounded-lg text-sm bg-[#FFFDFB] text-[#423E3B] mr-8 border border-[#E5DFD9]"
            >
              <span className="text-xs text-[#8E867E] block mb-1">MediWatch</span>
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={onDisconnect}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition bg-red-600 hover:bg-red-700 text-white"
        >
          <PhoneOff className="w-4 h-4" />
          Disconnect
        </button>
      </div>

      {/* State indicator */}
      <div className="mt-3 pt-3 border-t border-[#E5DFD9]">
        <div className="flex items-center justify-between text-xs text-[#8E867E]">
          <span>
            State: <span className="text-[#423E3B]">{state}</span>
          </span>
          <span>
            Powered by <span className="text-[#E78A62] font-medium">LiveKit</span>
          </span>
        </div>
      </div>
    </div>
  );
}
