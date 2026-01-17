'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Phone, PhoneOff, MessageSquare } from 'lucide-react';
import type { Alert } from '@/types';

interface VoiceAgentProps {
  recentAlert: Alert | null;
  onVoiceCommand: (command: string) => void;
}

// This component demonstrates the LiveKit integration concept
// In production, this would connect to a LiveKit server running a Python agent
export default function VoiceAgent({ recentAlert, onVoiceCommand }: VoiceAgentProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; text: string }>>([]);
  const recognitionRef = useRef<SpeechRecognitionInterface | null>(null);

  // Initialize speech recognition (browser API for demo)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleUserQuery(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleUserQuery = useCallback(
    (query: string) => {
      setMessages((prev) => [...prev, { role: 'user', text: query }]);

      // Simple command handling (in production, this would go to LiveKit agent)
      let response = '';
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes('what happened') || lowerQuery.includes('status')) {
        if (recentAlert) {
          response = `The most recent alert was a ${recentAlert.type} detected in ${recentAlert.location}. ${recentAlert.description}`;
        } else {
          response = 'No recent alerts. All monitored areas are normal.';
        }
      } else if (lowerQuery.includes('acknowledge') || lowerQuery.includes('clear')) {
        response = 'Alert acknowledged. The medical team has been notified.';
        onVoiceCommand('acknowledge');
      } else if (lowerQuery.includes('help') || lowerQuery.includes('emergency')) {
        response = 'Dispatching emergency response team to the location now.';
        onVoiceCommand('dispatch');
      } else {
        response = `I heard: "${query}". You can ask me about recent alerts, request status updates, or acknowledge emergencies.`;
      }

      setTimeout(() => {
        setMessages((prev) => [...prev, { role: 'agent', text: response }]);
        // In production, this would use ElevenLabs to speak the response
      }, 500);
    },
    [recentAlert, onVoiceCommand]
  );

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleConnection = () => {
    setIsConnected(!isConnected);
    if (!isConnected) {
      setMessages([
        {
          role: 'agent',
          text: 'MediWatch voice assistant connected. How can I help you?',
        },
      ]);
    } else {
      setMessages([]);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          Voice Assistant
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-48 overflow-y-auto mb-4 space-y-2 bg-gray-900/50 rounded-lg p-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center mt-16">
            Connect to start voice interaction
          </p>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600/20 text-blue-200 ml-8'
                  : 'bg-gray-700 text-gray-200 mr-8'
              }`}
            >
              <span className="text-xs text-gray-500 block mb-1">
                {msg.role === 'user' ? 'You' : 'MediWatch'}
              </span>
              {msg.text}
            </div>
          ))
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={toggleConnection}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
            isConnected
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isConnected ? (
            <>
              <PhoneOff className="w-4 h-4" />
              Disconnect
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              Connect
            </>
          )}
        </button>

        {isConnected && (
          <button
            onClick={toggleListening}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition ${
              isListening
                ? 'bg-orange-600 hover:bg-orange-700 text-white animate-pulse'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Speak
              </>
            )}
          </button>
        )}
      </div>

      {/* LiveKit badge */}
      <div className="mt-3 pt-3 border-t border-gray-700 text-center">
        <span className="text-xs text-gray-500">
          Powered by <span className="text-blue-400 font-medium">LiveKit</span>
        </span>
      </div>
    </div>
  );
}

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInterface {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognitionInterface;
  }
}
