import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';

let sdk: NodeSDK | null = null;

const DEFAULT_IGNORED_PATHS = ['/health', '/docs', '/docs-json', '/docs-yaml'];

function toBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value === 'true';
}

function parseHeaders(raw: string | undefined) {
  if (!raw) {
    return undefined;
  }

  const headers: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [key, ...rest] = pair.split('=');
    if (!key || !rest.length) {
      continue;
    }
    headers[key.trim()] = rest.join('=').trim();
  }

  return Object.keys(headers).length ? headers : undefined;
}

function resolveDiagLevel(raw: string | undefined) {
  switch (raw) {
    case 'none':
      return DiagLogLevel.NONE;
    case 'error':
      return DiagLogLevel.ERROR;
    case 'warn':
      return DiagLogLevel.WARN;
    case 'info':
      return DiagLogLevel.INFO;
    case 'debug':
      return DiagLogLevel.DEBUG;
    case 'verbose':
      return DiagLogLevel.VERBOSE;
    case 'all':
      return DiagLogLevel.ALL;
    default:
      return process.env.NODE_ENV === 'production'
        ? DiagLogLevel.ERROR
        : DiagLogLevel.WARN;
  }
}

function resolveIgnoredPaths() {
  const raw = process.env.OTEL_IGNORE_PATHS;
  if (!raw) {
    return DEFAULT_IGNORED_PATHS;
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveSampler() {
  const ratioRaw = process.env.OTEL_TRACE_SAMPLE_RATIO;
  const ratio = ratioRaw ? Number(ratioRaw) : 1;
  const normalizedRatio = Number.isFinite(ratio)
    ? Math.max(0, Math.min(1, ratio))
    : 1;

  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(normalizedRatio),
  });
}

export async function startTelemetry() {
  const enabled = toBoolean(process.env.OTEL_ENABLED, true);
  if (!enabled) {
    return;
  }

  diag.setLogger(
    new DiagConsoleLogger(),
    resolveDiagLevel(process.env.OTEL_DIAGNOSTIC_LOG_LEVEL),
  );

  const traceExporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`,
        headers: parseHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
      })
    : undefined;

  const ignoredPaths = resolveIgnoredPaths();

  sdk = new NodeSDK({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'new-stripe-api',
    traceExporter,
    sampler: resolveSampler(),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          ignoreIncomingRequestHook: (request: { url?: string }) => {
            if (!request.url) {
              return false;
            }

            return ignoredPaths.some((path) => request.url?.startsWith(path));
          },
        },
      }),
    ],
  });

  try {
    await sdk.start();
  } catch (error) {
    const strictStartup = toBoolean(process.env.OTEL_STRICT_STARTUP, false);
    if (strictStartup) {
      throw error;
    }
    diag.error('Telemetry startup failed; continuing without OpenTelemetry.');
    sdk = null;
  }
}

export async function shutdownTelemetry() {
  if (!sdk) {
    return;
  }

  await sdk.shutdown();
  sdk = null;
}
