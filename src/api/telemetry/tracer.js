/**
 * OpenTelemetry In-Memory Tracer
 *
 * Browser-compatible OTEL setup (uses sdk-trace-web, NOT sdk-node).
 * Spans are stored in a Zustand store so DebugViewer can read them reactively.
 */

import { WebTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-web';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { create } from 'zustand';

// ---- In-memory span exporter (for raw OTEL span access if needed) ----
export const spanExporter = new InMemorySpanExporter();

const provider = new WebTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(spanExporter));
provider.register();

export const tracer = trace.getTracer('vibe-ide', '0.1.0');

// ---- Zustand store — DebugViewer reads from here ----
export const useTraceStore = create((set) => ({
  traces: [],           // { id, name, duration, status, tokens, cost, timestamp, spans[], error? }
  tokenUsageHistory: [], // { time, input, output, cost }

  appendTrace: (traceRecord) =>
    set((s) => ({ traces: [...s.traces.slice(-49), traceRecord] })),

  appendTokenUsage: (entry) =>
    set((s) => ({ tokenUsageHistory: [...s.tokenUsageHistory.slice(-19), entry] })),

  clearTraces: () => set({ traces: [], tokenUsageHistory: [] }),
}));

/**
 * Wrap an async function with an OTEL span.
 * The fn receives a childTracer object for creating child spans.
 * If the result has __tokens__ and __cost__, they are recorded in the trace store.
 *
 * @param {string} traceName - Label shown in DebugViewer
 * @param {function} fn - async (childTracer) => result
 */
export async function withSpan(traceName, fn) {
  const t0 = performance.now();
  const rootSpan = tracer.startSpan(traceName);
  const ctx = trace.setSpan(context.active(), rootSpan);
  const childSpans = [];

  const childTracer = {
    /**
     * Create a named child span around an async operation.
     * Returns the operation's result.
     */
    span: async (name, innerFn) => {
      const s = tracer.startSpan(name, {}, ctx);
      const st = performance.now();
      try {
        const r = await innerFn();
        const dur = Math.round(performance.now() - st);
        s.end();
        childSpans.push({
          id: s.spanContext().spanId,
          name,
          start: Math.round(st - t0),
          duration: dur,
        });
        return r;
      } catch (err) {
        const dur = Math.round(performance.now() - st);
        s.recordException(err);
        s.setStatus({ code: SpanStatusCode.ERROR });
        s.end();
        childSpans.push({
          id: s.spanContext().spanId,
          name,
          start: Math.round(st - t0),
          duration: dur,
        });
        throw err;
      }
    },
  };

  try {
    const result = await fn(childTracer);
    const duration = Math.round(performance.now() - t0);
    rootSpan.end();

    const tokens = result?.__tokens__ ?? { input: 0, output: 0 };
    const cost = result?.__cost__ ?? 0;

    const traceRecord = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: traceName,
      duration,
      status: 'success',
      tokens,
      cost,
      timestamp: new Date().toISOString().slice(11, 23),
      spans: childSpans.length > 0
        ? childSpans
        : [{ id: `s-${Date.now()}`, name: 'execute', start: 0, duration }],
    };

    useTraceStore.getState().appendTrace(traceRecord);

    if (tokens.input + tokens.output > 0) {
      useTraceStore.getState().appendTokenUsage({
        time: new Date().toISOString().slice(11, 19),
        input: tokens.input,
        output: tokens.output,
        cost,
      });
    }

    return result;
  } catch (err) {
    const duration = Math.round(performance.now() - t0);
    rootSpan.recordException(err);
    rootSpan.setStatus({ code: SpanStatusCode.ERROR });
    rootSpan.end();

    useTraceStore.getState().appendTrace({
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: traceName,
      duration,
      status: 'error',
      tokens: { input: 0, output: 0 },
      cost: 0,
      timestamp: new Date().toISOString().slice(11, 23),
      spans: childSpans.length > 0
        ? childSpans
        : [{ id: `s-${Date.now()}`, name: 'execute', start: 0, duration }],
      error: err.message,
    });

    throw err;
  }
}
