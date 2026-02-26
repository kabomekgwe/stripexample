import { SpanStatusCode, trace } from '@opentelemetry/api';

type SpanAttributeValue = string | number | boolean;

export async function runInSpan<T>(
  spanName: string,
  attributes: Record<string, SpanAttributeValue | undefined>,
  fn: () => Promise<T>,
): Promise<T> {
  const tracer = trace.getTracer('new-stripe-api');

  return tracer.startActiveSpan(spanName, async (span) => {
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined) {
        span.setAttribute(key, value);
      }
    }

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

export function addSpanAttributes(
  attributes: Record<string, SpanAttributeValue | undefined>,
) {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}
