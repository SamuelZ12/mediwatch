import type {
  PatientSnapshot,
  RiskPrediction,
  AnomalyResult,
  TriageRecommendation,
  CameraRoom,
  Alert,
  ContributingFactor,
} from '@/types';

const WOODWIDE_API_URL = process.env.WOODWIDE_API_URL || 'https://api.woodwide.ai';
const WOODWIDE_API_KEY = process.env.WOODWIDE_API_KEY || '';

interface WoodWideResponse<T> {
  data?: T;
  error?: string;
}

async function woodwideRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<WoodWideResponse<T>> {
  const startTime = performance.now();

  try {
    const response = await fetch(`${WOODWIDE_API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WOODWIDE_API_KEY}`,
        ...options.headers,
      },
    });

    const latencyMs = performance.now() - startTime;
    console.log(`[WoodWide] ${options.method || 'GET'} ${endpoint} - ${response.status} (${latencyMs.toFixed(0)}ms)`);

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `API error: ${response.status} - ${errorText}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('[WoodWide] Request error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export function generatePatientSnapshot(
  room: CameraRoom,
  alerts: Alert[]
): PatientSnapshot {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const roomAlerts = alerts.filter(a => a.location === room.roomCode);
  const alertsLastHour = roomAlerts.filter(a => new Date(a.timestamp) > oneHourAgo);
  const alertsLast24h = roomAlerts.filter(a => new Date(a.timestamp) > twentyFourHoursAgo);

  const lastAlert = roomAlerts.length > 0
    ? roomAlerts.reduce((latest, a) =>
        new Date(a.timestamp) > new Date(latest.timestamp) ? a : latest
      )
    : null;

  const timeSinceLastAlert = lastAlert
    ? (now.getTime() - new Date(lastAlert.timestamp).getTime()) / (1000 * 60)
    : 999;

  return {
    patient_id: room.id,
    timestamp: now.toISOString(),
    heart_rate: room.stats.heartRate,
    oxygen_saturation: room.stats.oxygen,
    current_status: room.stats.status,
    alert_count_1h: alertsLastHour.length,
    alert_count_24h: alertsLast24h.length,
    last_emergency_type: lastAlert?.type || null,
    last_emergency_confidence: lastAlert?.confidence || 0,
    time_since_last_alert_mins: Math.round(timeSinceLastAlert),
  };
}

function calculateLocalRiskScore(snapshot: PatientSnapshot): number {
  let score = 0;

  // Heart rate factors
  if (snapshot.heart_rate < 50) score += 30;
  else if (snapshot.heart_rate < 60) score += 15;
  else if (snapshot.heart_rate > 120) score += 35;
  else if (snapshot.heart_rate > 100) score += 20;
  else if (snapshot.heart_rate > 90) score += 10;

  // Oxygen saturation factors
  if (snapshot.oxygen_saturation < 90) score += 40;
  else if (snapshot.oxygen_saturation < 92) score += 30;
  else if (snapshot.oxygen_saturation < 94) score += 20;
  else if (snapshot.oxygen_saturation < 96) score += 10;

  // Status factors
  if (snapshot.current_status === 'Critical') score += 25;
  else if (snapshot.current_status === 'Warning') score += 15;

  // Alert history factors
  score += Math.min(snapshot.alert_count_1h * 10, 30);
  score += Math.min(snapshot.alert_count_24h * 2, 15);

  // Recent emergency factor
  if (snapshot.last_emergency_type && snapshot.last_emergency_type !== 'normal') {
    const recencyBonus = Math.max(0, 20 - snapshot.time_since_last_alert_mins / 3);
    score += recencyBonus * snapshot.last_emergency_confidence;
  }

  return Math.min(Math.round(score), 100);
}

function getContributingFactors(snapshot: PatientSnapshot): ContributingFactor[] {
  const factors: ContributingFactor[] = [];

  // Heart rate
  if (snapshot.heart_rate < 50 || snapshot.heart_rate > 120) {
    factors.push({
      factor: 'Heart Rate',
      importance: 0.9,
      direction: 'increases_risk',
    });
  } else if (snapshot.heart_rate < 60 || snapshot.heart_rate > 100) {
    factors.push({
      factor: 'Heart Rate',
      importance: 0.5,
      direction: 'increases_risk',
    });
  } else {
    factors.push({
      factor: 'Heart Rate',
      importance: 0.3,
      direction: 'decreases_risk',
    });
  }

  // Oxygen saturation
  if (snapshot.oxygen_saturation < 92) {
    factors.push({
      factor: 'Oxygen Saturation',
      importance: 0.95,
      direction: 'increases_risk',
    });
  } else if (snapshot.oxygen_saturation < 96) {
    factors.push({
      factor: 'Oxygen Saturation',
      importance: 0.4,
      direction: 'increases_risk',
    });
  } else {
    factors.push({
      factor: 'Oxygen Saturation',
      importance: 0.2,
      direction: 'decreases_risk',
    });
  }

  // Recent alerts
  if (snapshot.alert_count_1h > 0) {
    factors.push({
      factor: 'Recent Alerts',
      importance: Math.min(snapshot.alert_count_1h * 0.3, 0.8),
      direction: 'increases_risk',
    });
  }

  // Current status
  if (snapshot.current_status === 'Critical') {
    factors.push({
      factor: 'Current Status',
      importance: 0.85,
      direction: 'increases_risk',
    });
  } else if (snapshot.current_status === 'Warning') {
    factors.push({
      factor: 'Current Status',
      importance: 0.5,
      direction: 'increases_risk',
    });
  }

  return factors.sort((a, b) => b.importance - a.importance);
}

function getRecommendedAction(riskScore: number, snapshot: PatientSnapshot): string {
  if (riskScore >= 80) {
    if (snapshot.oxygen_saturation < 90) {
      return 'Dispatch respiratory specialist immediately';
    }
    if (snapshot.heart_rate > 120 || snapshot.heart_rate < 50) {
      return 'Request cardiac monitoring and physician review';
    }
    return 'Immediate bedside assessment required';
  }
  if (riskScore >= 60) {
    return 'Prioritize next wellness check within 15 minutes';
  }
  if (riskScore >= 40) {
    return 'Schedule follow-up check within 30 minutes';
  }
  return 'Continue routine monitoring';
}

export async function predictPatientRisk(
  snapshot: PatientSnapshot,
  modelId?: string
): Promise<RiskPrediction> {
  // If we have a model ID, try to use Wood Wide API
  if (modelId && WOODWIDE_API_KEY) {
    const response = await woodwideRequest<{ predictions: Array<{ risk_score: number }> }>(
      `/api/models/prediction/${modelId}/infer`,
      {
        method: 'POST',
        body: JSON.stringify({
          coerce_schema: true,
          data: [snapshot],
        }),
      }
    );

    if (response.data?.predictions?.[0]) {
      const prediction = response.data.predictions[0];
      const riskScore = Math.round(prediction.risk_score);
      return {
        patient_id: snapshot.patient_id,
        risk_score: riskScore,
        deterioration_probability: riskScore / 100 * 0.8,
        contributing_factors: getContributingFactors(snapshot),
        recommended_action: getRecommendedAction(riskScore, snapshot),
        confidence: 0.85,
      };
    }
  }

  // Fallback to local calculation
  const riskScore = calculateLocalRiskScore(snapshot);
  return {
    patient_id: snapshot.patient_id,
    risk_score: riskScore,
    deterioration_probability: riskScore / 100 * 0.7,
    contributing_factors: getContributingFactors(snapshot),
    recommended_action: getRecommendedAction(riskScore, snapshot),
    confidence: 0.7,
  };
}

export async function detectAnomalies(
  snapshots: PatientSnapshot[],
  modelId?: string
): Promise<AnomalyResult[]> {
  // If we have a model ID, try to use Wood Wide API
  if (modelId && WOODWIDE_API_KEY) {
    const response = await woodwideRequest<{ anomalies: AnomalyResult[] }>(
      `/api/models/anomaly/${modelId}/detect`,
      {
        method: 'POST',
        body: JSON.stringify({
          data: snapshots,
        }),
      }
    );

    if (response.data?.anomalies) {
      return response.data.anomalies;
    }
  }

  // Fallback to local anomaly detection
  return snapshots.map(snapshot => {
    const anomalousFeatures: string[] = [];
    let anomalyScore = 0;

    if (snapshot.heart_rate < 50 || snapshot.heart_rate > 130) {
      anomalousFeatures.push('heart_rate');
      anomalyScore += 0.4;
    }
    if (snapshot.oxygen_saturation < 90) {
      anomalousFeatures.push('oxygen_saturation');
      anomalyScore += 0.5;
    }
    if (snapshot.alert_count_1h >= 3) {
      anomalousFeatures.push('alert_frequency');
      anomalyScore += 0.3;
    }

    return {
      patient_id: snapshot.patient_id,
      is_anomaly: anomalyScore >= 0.5,
      anomaly_score: Math.min(anomalyScore, 1),
      anomalous_features: anomalousFeatures,
    };
  });
}

export async function generateTriageRecommendation(
  rooms: CameraRoom[],
  alerts: Alert[],
  modelId?: string
): Promise<TriageRecommendation> {
  const snapshots = rooms.map(room => generatePatientSnapshot(room, alerts));
  const predictions = await Promise.all(
    snapshots.map(snapshot => predictPatientRisk(snapshot, modelId))
  );

  const priorityOrder = predictions
    .map((prediction, index) => {
      const room = rooms[index];
      const contributingFactor = prediction.contributing_factors[0];
      return {
        patient_id: room.id,
        patient_name: room.name,
        room_code: room.roomCode,
        risk_score: prediction.risk_score,
        primary_concern: contributingFactor
          ? `${contributingFactor.factor} ${contributingFactor.direction === 'increases_risk' ? 'elevated' : 'stable'}`
          : 'General monitoring',
        action: prediction.recommended_action,
      };
    })
    .sort((a, b) => b.risk_score - a.risk_score);

  return {
    priority_order: priorityOrder,
    timestamp: new Date(),
  };
}

export async function uploadDataset(
  data: PatientSnapshot[],
  datasetName: string
): Promise<{ dataset_id: string } | null> {
  if (!WOODWIDE_API_KEY) {
    console.warn('[WoodWide] API key not configured, skipping dataset upload');
    return null;
  }

  const csvContent = convertToCsv(data);
  const blob = new Blob([csvContent], { type: 'text/csv' });

  const formData = new FormData();
  formData.append('file', blob, `${datasetName}.csv`);

  const response = await woodwideRequest<{ dataset_id: string }>(
    '/api/datasets',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WOODWIDE_API_KEY}`,
      },
      body: formData,
    }
  );

  return response.data || null;
}

function convertToCsv(data: PatientSnapshot[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header as keyof PatientSnapshot];
      return typeof value === 'string' ? `"${value}"` : value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

export async function trainPredictionModel(
  datasetId: string,
  modelName: string
): Promise<{ model_id: string } | null> {
  if (!WOODWIDE_API_KEY) {
    console.warn('[WoodWide] API key not configured, skipping model training');
    return null;
  }

  const response = await woodwideRequest<{ model_id: string }>(
    `/api/models/prediction/train?dataset_id=${datasetId}`,
    {
      method: 'POST',
      body: JSON.stringify({
        model_name: modelName,
        label_column: 'risk_score',
        input_columns: [
          'heart_rate',
          'oxygen_saturation',
          'alert_count_1h',
          'alert_count_24h',
          'time_since_last_alert_mins',
        ],
        overwrite: false,
      }),
    }
  );

  return response.data || null;
}

export async function getModelStatus(
  modelId: string
): Promise<{ status: string; progress?: number } | null> {
  if (!WOODWIDE_API_KEY) {
    return null;
  }

  const response = await woodwideRequest<{ status: string; progress?: number }>(
    `/api/models/${modelId}`,
    { method: 'GET' }
  );

  return response.data || null;
}
