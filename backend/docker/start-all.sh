#!/bin/bash
# Starts all 10 PeerVault Spring Boot services as separate JVM processes inside one container,
# in the dependency order backend/docker-compose.yml's `depends_on: condition: service_healthy`
# chain enforces across separate containers:
#   1. eureka-server        (nothing else can register/discover before this is up)
#   2. config-server        (needs Vault reachable externally; every other service fails fast
#                             without it, per spring.cloud.config.fail-fast in each application.yml)
#   3. api-gateway + the 7 business services, all in parallel once config-server is serving.
#
# If any service process dies, the whole container exits (killing the rest) so a container
# orchestrator (docker restart policy, k8s, etc.) can restart the whole thing cleanly rather than
# leaving a half-up mesh running.
set -u

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
JAVA_OPTS="${JAVA_OPTS:-}"
PIDS=()

start() {
  local name="$1" jar="$2" port="$3"
  echo "[start-all] starting $name on port $port"
  # shellcheck disable=SC2086
  java $JAVA_OPTS -jar "$APP_DIR/$jar" --server.port="$port" &
  PIDS+=("$!")
}

wait_for_port() {
  local host="$1" port="$2" name="$3"
  echo "[start-all] waiting for $name ($host:$port)..."
  for _ in $(seq 1 60); do
    if (exec 3<>"/dev/tcp/$host/$port") 2>/dev/null; then
      exec 3>&- 3<&-
      echo "[start-all] $name is up"
      return 0
    fi
    sleep 2
  done
  echo "[start-all] timed out waiting for $name on $host:$port" >&2
  return 1
}

shutdown() {
  echo "[start-all] shutting down..."
  kill "${PIDS[@]}" 2>/dev/null
  wait
  exit 0
}
trap shutdown TERM INT

start eureka-server eureka-server.jar 8761
wait_for_port localhost 8761 eureka-server || exit 1

start config-server config-server.jar 8888
wait_for_port localhost 8888 config-server || exit 1
# Give config-server's Vault composite backend a moment past the bare TCP-accept check above to
# finish warming up (its own Vault session/token setup) before the next 8 services all hit it for
# their first config fetch at once — without this, that opening burst can race config-server's Vault
# client init and trip each service's spring.cloud.config.fail-fast before its own retry logic gets
# a chance to kick in.
sleep 5

# Staggered, not simultaneous — same reasoning as above: 8 fresh JVMs all making their first
# (Vault-backed) config-server request in the same instant is exactly the thundering-herd pattern
# that caused the race this comment describes. A separate-container docker-compose deployment gets
# natural staggering for free from container-creation overhead; inside one container we add it back
# explicitly.
start api-gateway         api-gateway.jar         8080
sleep 3
start auth-service        auth-service.jar        8081
sleep 3
start device-service      device-service.jar      8082
sleep 3
start file-service        file-service.jar        8083
sleep 3
start transfer-service    transfer-service.jar    8084
sleep 3
start security-service    security-service.jar    8085
sleep 3
start notification-service notification-service.jar 8086
sleep 3
start share-service       share-service.jar       8087

echo "[start-all] all services started (pids: ${PIDS[*]})"

# Block until the first background job exits, then tear everything else down.
wait -n
code=$?
echo "[start-all] a service process exited (code $code) — stopping the rest"
kill "${PIDS[@]}" 2>/dev/null
wait
exit "$code"
