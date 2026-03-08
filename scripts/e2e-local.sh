#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for local e2e tests." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not running. Start Docker, then rerun make e2e-local." >&2
  exit 1
fi

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

APP_URL="${APP_URL:-http://127.0.0.1:8000}"
GO_API_BASE_URL="${GO_API_BASE_URL:-http://127.0.0.1:8080}"
APP_URL="${APP_URL/localhost/127.0.0.1}"
GO_API_BASE_URL="${GO_API_BASE_URL/localhost/127.0.0.1}"
PORTAL_PORT="$(php -r 'echo parse_url($argv[1], PHP_URL_PORT) ?: 8000;' "$APP_URL")"
GO_API_HEALTH_URL="${GO_API_BASE_URL%/}/health"
QUEUE_CREATE_URL="${APP_URL%/}/api/instant/queues"

PHP_SERVER_PID=""

cleanup() {
  if [ -n "$PHP_SERVER_PID" ] && kill -0 "$PHP_SERVER_PID" >/dev/null 2>&1; then
    kill "$PHP_SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

wait_for_url() {
  local url="$1"
  local label="$2"

  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi

    sleep 1
  done

  echo "Timed out waiting for $label at $url" >&2
  return 1
}

echo "Starting local infrastructure..."
docker compose up -d redis postgres >/dev/null
docker compose up -d --build go-api >/dev/null

echo "Waiting for Go API..."
wait_for_url "$GO_API_HEALTH_URL" "Go API"

echo "Resetting Redis..."
docker compose exec -T redis redis-cli FLUSHALL >/dev/null

echo "Running migrations..."
php artisan migrate --force >/dev/null

EXISTING_PIDS="$(lsof -tiTCP:"$PORTAL_PORT" -sTCP:LISTEN || true)"

if [ -n "$EXISTING_PIDS" ]; then
  echo "Restarting Laravel on port $PORTAL_PORT..."
  kill $EXISTING_PIDS >/dev/null 2>&1 || true
  sleep 1
fi

echo "Starting Laravel on port $PORTAL_PORT..."
php artisan serve --host=127.0.0.1 --port="$PORTAL_PORT" >/tmp/poofmq-e2e-laravel.log 2>&1 &
PHP_SERVER_PID=$!

echo "Waiting for Laravel..."
wait_for_url "$APP_URL" "Laravel"

echo "Creating queue through portal..."
QUEUE_RESPONSE="$(curl -fsS -X POST "$QUEUE_CREATE_URL" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{"turnstile_token":"local-development-bypass"}')"

QUEUE_ID="$(php -r '
$payload = json_decode($argv[1], true);
if (!is_array($payload) || !isset($payload["queue_id"])) {
    fwrite(STDERR, "Queue creation response missing queue_id\n");
    exit(1);
}
echo $payload["queue_id"];
' "$QUEUE_RESPONSE")"

echo "Queue created: $QUEUE_ID"

PUSH_RESPONSE="$(curl -fsS -X POST "${GO_API_BASE_URL%/}/v1/queues/$QUEUE_ID/messages" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{"envelope":{"event_type":"test.event","payload":{"foo":"bar"}}}')"

php -r '
$payload = json_decode($argv[1], true);
if (!is_array($payload) || empty($payload["message_id"] ?? $payload["messageId"] ?? null)) {
    fwrite(STDERR, "Push response missing message_id\n");
    exit(1);
}
' "$PUSH_RESPONSE"

echo "Push succeeded."

POP_RESPONSE="$(curl -fsS -X POST "${GO_API_BASE_URL%/}/v1/queues/$QUEUE_ID/messages:pop" \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{}')"

php -r '
$payload = json_decode($argv[1], true);
if (!is_array($payload) || !isset($payload["message"]["envelope"])) {
    fwrite(STDERR, "Pop response missing envelope\n");
    exit(1);
}

$envelope = $payload["message"]["envelope"];

if (($envelope["eventType"] ?? $envelope["event_type"] ?? null) !== "test.event") {
    fwrite(STDERR, "Unexpected event_type\n");
    exit(1);
}

if (($envelope["payload"]["foo"] ?? null) !== "bar") {
    fwrite(STDERR, "Unexpected payload\n");
    exit(1);
}
' "$POP_RESPONSE"

echo "Pop succeeded."
echo "Local e2e passed."
