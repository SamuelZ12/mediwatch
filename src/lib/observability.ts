// Arize Phoenix Observability Wrapper
// This provides tracing for AI model calls to monitor performance and accuracy

export interface TraceSpan {
  id: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  attributes: Record<string, unknown>;
  status: 'ok' | 'error';
  events: Array<{ name: string; timestamp: Date; attributes?: Record<string, unknown> }>;
}

export interface ModelTrace {
  spanId: string;
  modelName: string;
  input: string;
  output: string;
  latencyMs: number;
  tokenCount?: number;
  confidence?: number;
  timestamp: Date;
}

// In-memory trace storage (for demo - in production, send to Arize)
const traces: ModelTrace[] = [];
const MAX_TRACES = 1000;

export function createTrace(modelName: string): {
  spanId: string;
  startTime: number;
  complete: (output: string, confidence?: number) => void;
} {
  const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const startTime = performance.now();

  return {
    spanId,
    startTime,
    complete: (output: string, confidence?: number) => {
      const endTime = performance.now();
      const trace: ModelTrace = {
        spanId,
        modelName,
        input: '', // Set by caller
        output,
        latencyMs: endTime - startTime,
        confidence,
        timestamp: new Date(),
      };

      traces.push(trace);

      // Keep only last MAX_TRACES
      if (traces.length > MAX_TRACES) {
        traces.shift();
      }

      // In production, send to Arize Phoenix
      // sendToArize(trace);
    },
  };
}

export function recordAnalysis(
  input: string,
  result: {
    type: string;
    confidence: number;
    description: string;
  },
  latencyMs: number
): void {
  const trace: ModelTrace = {
    spanId: `analysis-${Date.now()}`,
    modelName: 'gemini-3-flash-preview',
    input: `[Image Frame] ${input.substring(0, 100)}...`,
    output: JSON.stringify(result),
    latencyMs,
    confidence: result.confidence,
    timestamp: new Date(),
  };

  traces.push(trace);

  if (traces.length > MAX_TRACES) {
    traces.shift();
  }
}

export function getTraces(): ModelTrace[] {
  return [...traces];
}

export function getStats(): {
  totalTraces: number;
  avgLatency: number;
  avgConfidence: number;
  emergencyRate: number;
} {
  if (traces.length === 0) {
    return {
      totalTraces: 0,
      avgLatency: 0,
      avgConfidence: 0,
      emergencyRate: 0,
    };
  }

  const latencies = traces.map((t) => t.latencyMs);
  const confidences = traces.filter((t) => t.confidence !== undefined).map((t) => t.confidence!);
  const emergencies = traces.filter((t) => {
    try {
      const output = JSON.parse(t.output);
      return output.emergency === true;
    } catch {
      return false;
    }
  });

  return {
    totalTraces: traces.length,
    avgLatency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
    avgConfidence:
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0,
    emergencyRate: emergencies.length / traces.length,
  };
}

export function clearTraces(): void {
  traces.length = 0;
}
