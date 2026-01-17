export type EmergencyType =
  | 'fall'
  | 'choking'
  | 'seizure'
  | 'unconscious'
  | 'distress'
  | 'normal';

export interface AnalysisResult {
  emergency: boolean;
  type: EmergencyType;
  confidence: number;
  description: string;
  timestamp: Date;
  frameData?: string;
}

export interface Alert {
  id: string;
  type: EmergencyType;
  confidence: number;
  description: string;
  timestamp: Date;
  location: string;
  acknowledged: boolean;
  videoClipUrl?: string;
}

export interface VoiceAlertConfig {
  language: 'en' | 'es' | 'zh';
  voiceId?: string;
}

export interface CameraRoomStats {
  heartRate: number;
  oxygen: number;
  status: 'Normal' | 'Warning' | 'Critical';
}

export interface CameraRoom {
  id: string;
  name: string;
  roomCode: string;
  stats: CameraRoomStats;
  isRecording: boolean;
}
