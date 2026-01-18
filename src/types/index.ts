export type EmergencyType =
  | 'fall'
  | 'choking'
  | 'seizure'
  | 'unconscious'
  | 'distress'
  | 'normal';

export interface FaceLandmark {
  x: number;  // normalized 0-1
  y: number;  // normalized 0-1
}

export interface BoundingBox {
  x: number;      // normalized 0-1
  y: number;      // normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
  label?: string;
  confidence?: number;  // detection confidence
  landmarks?: FaceLandmark[];  // face landmarks
  keypoints?: FaceLandmark[];  // pose keypoints
}

export interface AnalysisResult {
  emergency: boolean;
  type: EmergencyType;
  confidence: number;
  description: string;
  timestamp: Date;
  frameData?: string;
  persons?: BoundingBox[];  // detected person locations
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
  riskScore?: number;
}

// Wood Wide AI types
export interface PatientSnapshot {
  patient_id: string;
  timestamp: string;
  heart_rate: number;
  oxygen_saturation: number;
  current_status: 'Normal' | 'Warning' | 'Critical';
  alert_count_1h: number;
  alert_count_24h: number;
  last_emergency_type: EmergencyType | null;
  last_emergency_confidence: number;
  time_since_last_alert_mins: number;
}

export interface ContributingFactor {
  factor: string;
  importance: number;
  direction: 'increases_risk' | 'decreases_risk';
}

export interface RiskPrediction {
  patient_id: string;
  risk_score: number;
  deterioration_probability: number;
  contributing_factors: ContributingFactor[];
  recommended_action: string;
  confidence: number;
}

export interface TriagePriority {
  patient_id: string;
  patient_name: string;
  room_code: string;
  risk_score: number;
  primary_concern: string;
  action: string;
}

export interface TriageRecommendation {
  priority_order: TriagePriority[];
  timestamp: Date;
}

export interface AnomalyResult {
  patient_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  anomalous_features: string[];
}
