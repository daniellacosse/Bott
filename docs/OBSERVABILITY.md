# Observability with OpenTelemetry

Bott uses standard `console` methods for logging, which makes it easy to
integrate with OpenTelemetry and other observability platforms.

## Local Development

When running Bott with `ENV=local`, console output is automatically written to a
JSONL log file at `.output/logs/bott.log`. This file can be viewed using the
**OpenTelemetry Log Viewer** VS Code extension for an interactive, filterable
experience.

### Setup

1. Install the VS Code extension:
   - Extension: **OpenTelemetry Log Viewer** by Tobias Streng
   - VS Code Marketplace:
     [OpenTelemetry Log Viewer](https://marketplace.visualstudio.com/items?itemName=TobiasStreng.vscode-opentelemetry-log-viewer)

2. Run Bott locally:
   ```bash
   ./run deno run --allow-all app/main.ts
   ```

3. Open `.output/logs/bott.log` in VS Code
   - The extension displays logs in a dynamic, filterable AG Grid table
   - Click to expand JSON fields and filter by level, timestamp, or content

### Benefits

- **Automatic logging** - No code changes required
- **Pure Deno workflow** - No Docker or external services needed
- **VS Code integration** - View logs directly in your editor
- **Interactive filtering** - Search and filter logs with AG Grid
- **JSON expansion** - Easily inspect complex log objects

## Overview

Starting with the removal of the custom `@bott/log` library, Bott now uses
native console methods:

- `console.info()` - Informational messages
- `console.debug()` - Debug messages
- `console.warn()` - Warning messages
- `console.error()` - Error messages
- `console.time()` / `console.timeEnd()` - Performance timing

This approach allows console output to be captured by OpenTelemetry collectors
and exported to various observability backends.

## Running with OpenTelemetry

### Using Deno with OpenTelemetry

Deno can be configured to export telemetry data to OpenTelemetry-compatible
backends. There are several approaches:

#### 1. Using OpenTelemetry SDK (Recommended)

Add OpenTelemetry dependencies to your project:

```typescript
// In your main application file or a dedicated observability setup file
import { trace } from "npm:@opentelemetry/api@^1.9.0";
import { NodeTracerProvider } from "npm:@opentelemetry/sdk-trace-node@^1.28.0";
import { OTLPTraceExporter } from "npm:@opentelemetry/exporter-trace-otlp-http@^0.54.0";
import { Resource } from "npm:@opentelemetry/resources@^1.28.0";
import { ATTR_SERVICE_NAME } from "npm:@opentelemetry/semantic-conventions@^1.28.0";
import { BatchSpanProcessor } from "npm:@opentelemetry/sdk-trace-base@^1.28.0";

// Configure the tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "bott",
  }),
});

// Configure the OTLP exporter
const exporter = new OTLPTraceExporter({
  url: Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT") ||
    "http://localhost:4318/v1/traces",
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();
```

#### 2. Environment Variables

Configure OpenTelemetry using standard environment variables in your
`.env.local` or `.env.production`:

```bash
# OpenTelemetry Configuration
OTEL_SERVICE_NAME=bott
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp

# Optional: Configure sampling
OTEL_TRACES_SAMPLER=traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces
```

#### 3. Using a Sidecar Collector

Run the OpenTelemetry Collector as a sidecar container:

```yaml
# docker-compose.yml
services:
  bott:
    build: .
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
    depends_on:
      - otel-collector

  otel-collector:
    image: otel/opentelemetry-collector:latest
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4318:4318" # OTLP HTTP receiver
      - "8888:8888" # Prometheus metrics
```

## Console Output Capture

### Capturing Console Logs

Console output from Bott can be captured by:

1. **Cloud Platform Native Logging** (when deployed):
   - **GCP Cloud Logging**: Automatically captures `stdout` and `stderr`
   - **AWS CloudWatch**: Captures container logs
   - **Azure Monitor**: Captures application logs

2. **OpenTelemetry Log Bridge**:
   ```typescript
   import { logs } from "npm:@opentelemetry/api-logs@^0.54.0";
   import {
     BatchLogRecordProcessor,
     LoggerProvider,
   } from "npm:@opentelemetry/sdk-logs@^0.54.0";
   import { OTLPLogExporter } from "npm:@opentelemetry/exporter-logs-otlp-http@^0.54.0";

   const loggerProvider = new LoggerProvider();
   loggerProvider.addLogRecordProcessor(
     new BatchLogRecordProcessor(
       new OTLPLogExporter({
         url: Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT") + "/v1/logs",
       }),
     ),
   );
   ```

3. **Structured Logging with JSON**:
   ```typescript
   // Override console methods to output structured JSON
   const originalInfo = console.info;
   console.info = (...args: unknown[]) => {
     originalInfo(JSON.stringify({
       level: "info",
       timestamp: new Date().toISOString(),
       message: args.join(" "),
     }));
   };
   ```

## GCP Cloud Logging Integration

When running on Google Cloud Run, Bott automatically integrates with Cloud
Logging:

1. All `console.*` output is captured
2. Logs are structured with severity levels:
   - `console.debug()` → DEBUG
   - `console.info()` → INFO
   - `console.warn()` → WARNING
   - `console.error()` → ERROR

3. View logs using:
   ```bash
   ENV=production ./run deno task logs
   ```

   Or directly via gcloud:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=bott-production" --limit 50 --format json
   ```

## Performance Monitoring

### Using console.time/timeEnd

Bott uses `console.time()` and `console.timeEnd()` for performance measurements:

```typescript
console.time("operation-name");
// ... perform work ...
console.timeEnd("operation-name");
// Output: operation-name: 42.50ms
```

### OpenTelemetry Tracing

For distributed tracing, use OpenTelemetry spans:

```typescript
import { trace } from "npm:@opentelemetry/api@^1.9.0";

const tracer = trace.getTracer("bott");

async function processRequest() {
  const span = tracer.startSpan("process-request");
  try {
    // ... perform work ...
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
    throw error;
  } finally {
    span.end();
  }
}
```

## Metrics Collection

### Custom Metrics with OpenTelemetry

```typescript
import { metrics } from "npm:@opentelemetry/api@^1.9.0";
import { MeterProvider } from "npm:@opentelemetry/sdk-metrics@^1.28.0";
import { OTLPMetricExporter } from "npm:@opentelemetry/exporter-metrics-otlp-http@^0.54.0";

const meterProvider = new MeterProvider({
  readers: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT") + "/v1/metrics",
      }),
      exportIntervalMillis: 60000, // Export every 60 seconds
    }),
  ],
});

metrics.setGlobalMeterProvider(meterProvider);

// Create and use metrics
const meter = metrics.getMeter("bott");
const requestCounter = meter.createCounter("requests", {
  description: "Count of requests processed",
});

requestCounter.add(1, { status: "success" });
```

## Local Development

### Running with Jaeger (Local Tracing)

1. Start Jaeger using Docker:
   ```bash
   docker run -d --name jaeger \
     -e COLLECTOR_OTLP_ENABLED=true \
     -p 16686:16686 \
     -p 4318:4318 \
     jaegertracing/all-in-one:latest
   ```

2. Configure Bott to send traces to Jaeger:
   ```bash
   # In .env.local
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   ```

3. View traces at http://localhost:16686

### Running with Prometheus (Local Metrics)

1. Create `prometheus.yml`:
   ```yaml
   global:
     scrape_interval: 15s

   scrape_configs:
     - job_name: "bott"
       static_configs:
         - targets: ["host.docker.internal:8888"]
   ```

2. Start Prometheus:
   ```bash
   docker run -d --name prometheus \
     -p 9090:9090 \
     -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
     prom/prometheus
   ```

3. View metrics at http://localhost:9090

## Production Deployment

### GCP Cloud Trace

When deployed to Google Cloud Run, enable Cloud Trace:

1. Ensure the Cloud Trace API is enabled:
   ```bash
   gcloud services enable cloudtrace.googleapis.com
   ```

2. Configure OTLP exporter to use Google Cloud Trace:
   ```bash
   # In .env.production
   OTEL_EXPORTER_OTLP_ENDPOINT=https://cloudtrace.googleapis.com/v2
   ```

3. View traces in the
   [Cloud Trace Console](https://console.cloud.google.com/traces)

### Custom Backends

Bott can export to any OpenTelemetry-compatible backend:

- **Datadog**: Set `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.datadoghq.com`
- **New Relic**: Set `OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp.nr-data.net:4318`
- **Honeycomb**: Set `OTEL_EXPORTER_OTLP_ENDPOINT=https://api.honeycomb.io`
- **Grafana Cloud**: Set
  `OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-{region}.grafana.net/otlp`

Refer to your observability provider's documentation for specific configuration
details.

## Troubleshooting

### No telemetry data appearing

1. Check that OTEL environment variables are set correctly
2. Verify the collector endpoint is reachable
3. Check console output for OTLP exporter errors
4. Ensure sampling is not filtering out all traces

### High memory usage

1. Reduce batch size in span processor
2. Increase export interval
3. Adjust sampling rate to reduce volume

### Performance impact

1. Use asynchronous exporters
2. Configure batching appropriately
3. Consider using tail-based sampling
4. Use resource detectors sparingly

## Further Reading

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Deno Deploy OpenTelemetry](https://deno.com/deploy/docs/opentelemetry)
- [GCP Cloud Trace](https://cloud.google.com/trace/docs)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
