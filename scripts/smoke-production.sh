#!/usr/bin/env bash
set -euo pipefail

POOFMQ_BASE_URL="${POOFMQ_BASE_URL:-https://poofmq.com}"
POOFMQ_GO_API_URL="${POOFMQ_GO_API_URL:-https://go-api-production-ac36.up.railway.app}"
QUEUE_ID="$(uuidgen | tr '[:upper:]' '[:lower:]')"

echo "Checking public app routes..."
curl -fsS "$POOFMQ_BASE_URL/" >/dev/null
curl -fsS "$POOFMQ_BASE_URL/start" >/dev/null
curl -fsS "$POOFMQ_BASE_URL/up" >/dev/null

echo "Checking public Go API health and metrics..."
GO_HEALTH="$(curl -fsS "$POOFMQ_GO_API_URL/health")"
GO_METRICS="$(curl -fsS "$POOFMQ_GO_API_URL/metrics")"

php -r '
$health = json_decode($argv[1], true);
if (!is_array($health) || ($health["status"] ?? null) !== "ok") {
    fwrite(STDERR, "Go API health check failed\n");
    exit(1);
}
$metrics = json_decode($argv[2], true);
$required = [
    "push_total",
    "push_errors_total",
    "pop_total",
    "pop_errors_total",
    "avg_push_latency_ms",
    "avg_pop_latency_ms",
    "redis_memory_bytes",
];
foreach ($required as $key) {
    if (!array_key_exists($key, $metrics)) {
        fwrite(STDERR, "Missing metrics key: {$key}\n");
        exit(1);
    }
}
' "$GO_HEALTH" "$GO_METRICS"

echo "Running production push/pop smoke..."
PUSH_RESPONSE="$(curl -fsS -X POST "$POOFMQ_GO_API_URL/v1/queues/$QUEUE_ID/messages" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{"envelope":{"event_type":"smoke.production","payload":{"source":"smoke-production","check":"push-pop"}},"ttl_seconds":30}')"

php -r '
$payload = json_decode($argv[1], true);
if (!is_array($payload) || empty($payload["messageId"] ?? $payload["message_id"] ?? null)) {
    fwrite(STDERR, "Production push failed\n");
    exit(1);
}
' "$PUSH_RESPONSE"

POP_RESPONSE="$(curl -fsS -X POST "$POOFMQ_GO_API_URL/v1/queues/$QUEUE_ID/messages:pop" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{}')"

php -r '
$payload = json_decode($argv[1], true);
$check = $payload["message"]["envelope"]["payload"]["check"] ?? null;
$source = $payload["message"]["envelope"]["payload"]["source"] ?? null;
if ($check !== "push-pop" || $source !== "smoke-production") {
    fwrite(STDERR, "Production pop failed\n");
    exit(1);
}
' "$POP_RESPONSE"

echo "Production smoke passed."
