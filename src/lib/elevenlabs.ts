import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { EmergencyType } from '@/types';

let client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!client) {
    client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return client;
}

const VOICE_TEMPLATES: Record<EmergencyType, Record<string, string>> = {
  fall: {
    en: 'Alert: Fall detected in {location}. Patient may need immediate assistance.',
    es: 'Alerta: Caida detectada en {location}. El paciente puede necesitar asistencia inmediata.',
    zh: '警报：在{location}检测到跌倒。患者可能需要立即帮助。',
  },
  choking: {
    en: 'Emergency: Choking detected in {location}. Patient requires immediate airway assistance.',
    es: 'Emergencia: Asfixia detectada en {location}. El paciente requiere asistencia respiratoria inmediata.',
    zh: '紧急情况：在{location}检测到窒息。患者需要立即进行气道辅助。',
  },
  seizure: {
    en: 'Medical emergency: Seizure in progress in {location}. Medical team needed immediately.',
    es: 'Emergencia medica: Convulsion en progreso en {location}. Equipo medico necesario inmediatamente.',
    zh: '医疗紧急情况：{location}正在发生癫痫发作。立即需要医疗团队。',
  },
  unconscious: {
    en: 'Alert: Unresponsive patient detected in {location}. Please check immediately.',
    es: 'Alerta: Paciente sin respuesta detectado en {location}. Por favor verifique inmediatamente.',
    zh: '警报：在{location}检测到无反应患者。请立即检查。',
  },
  distress: {
    en: 'Alert: Patient in distress detected in {location}. Assistance may be needed.',
    es: 'Alerta: Paciente en apuros detectado en {location}. Puede necesitar asistencia.',
    zh: '警报：在{location}检测到患者处于困境。可能需要帮助。',
  },
  normal: {
    en: '',
    es: '',
    zh: '',
  },
};

export async function generateVoiceAlert(
  emergencyType: EmergencyType,
  location: string,
  language: 'en' | 'es' | 'zh' = 'en'
): Promise<Buffer | null> {
  if (emergencyType === 'normal') {
    return null;
  }

  const template = VOICE_TEMPLATES[emergencyType][language];
  const text = template.replace('{location}', location);

  try {
    const audioStream = await getClient().textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    // Convert ReadableStream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
}

export function getAlertText(
  emergencyType: EmergencyType,
  location: string,
  language: 'en' | 'es' | 'zh' = 'en'
): string {
  if (emergencyType === 'normal') {
    return '';
  }
  const template = VOICE_TEMPLATES[emergencyType][language];
  return template.replace('{location}', location);
}

export async function generateStartupMessage(
  language: 'en' | 'es' | 'zh' = 'en'
): Promise<Buffer | null> {
  const messages: Record<string, string> = {
    en: 'MediWatch monitoring system activated. Real-time analysis is now running.',
    es: 'Sistema de monitoreo MediWatch activado. El análisis en tiempo real está funcionando.',
    zh: 'MediWatch监控系统已激活。实时分析正在运行。',
  };

  const text = messages[language];

  try {
    const audioStream = await getClient().textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    // Convert ReadableStream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
}

export async function generateCustomText(
  text: string
): Promise<Buffer | null> {
  if (!text || text.trim().length === 0) {
    return null;
  }

  try {
    const audioStream = await getClient().textToSpeech.convert('JBFqnCBsd6RMkjVDRZzb', {
      text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    });

    // Convert ReadableStream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('ElevenLabs TTS error:', error);
    return null;
  }
}
