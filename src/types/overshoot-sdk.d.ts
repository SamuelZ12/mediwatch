declare module '@overshoot/sdk' {
  export interface StreamInferenceResult {
    ok: boolean;
    result?: string;
    error?: string;
  }

  export interface RealtimeVisionConfig {
    apiUrl: string;
    apiKey: string;
    prompt: string;
    source: { type: string; cameraFacing?: string };
    debug?: boolean;
    onResult: (result: StreamInferenceResult) => void;
    onError: (error: Error) => void;
  }

  export class RealtimeVision {
    constructor(config: RealtimeVisionConfig);
    start(): Promise<void>;
    stop(): void;
    getMediaStream(): MediaStream | null;
  }
}
