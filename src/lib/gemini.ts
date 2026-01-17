import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AnalysisResult, EmergencyType } from '@/types';
import { recordAnalysis } from './observability';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

const ANALYSIS_PROMPT = `You are a medical emergency detection AI monitoring patients in a healthcare facility.

Analyze this image for any medical emergencies or concerning situations. Look for:
1. FALL - Person on the ground, collapsed, or in an unusual position suggesting they fell
2. CHOKING - Person clutching throat, signs of respiratory distress, unable to speak
3. SEIZURE - Uncontrolled movements, convulsions, rigidity
4. UNCONSCIOUS - Person unresponsive, eyes closed, not moving normally
5. DISTRESS - Signs of pain, panic, or need for immediate assistance
6. NORMAL - No emergency detected, person appears fine

Respond in JSON format only:
{
  "emergency": boolean,
  "type": "fall" | "choking" | "seizure" | "unconscious" | "distress" | "normal",
  "confidence": number between 0 and 1,
  "description": "Brief description of what you observe"
}

Be conservative - only flag true emergencies with high confidence. False positives are better than missed emergencies.`;

export async function analyzeFrame(base64Image: string): Promise<AnalysisResult> {
  const startTime = performance.now();

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const result = await model.generateContent([
      ANALYSIS_PROMPT,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        emergency: false,
        type: 'normal',
        confidence: 0,
        description: 'Unable to analyze frame',
        timestamp: new Date(),
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const latencyMs = performance.now() - startTime;

    // Record to observability
    recordAnalysis(
      base64Image.substring(0, 50),
      {
        type: parsed.type,
        confidence: parsed.confidence,
        description: parsed.description,
      },
      latencyMs
    );

    return {
      emergency: parsed.emergency,
      type: parsed.type as EmergencyType,
      confidence: parsed.confidence,
      description: parsed.description,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return {
      emergency: false,
      type: 'normal',
      confidence: 0,
      description: 'Analysis error occurred',
      timestamp: new Date(),
    };
  }
}
