#!/usr/bin/env bash
# Verification harness for photography-gallery. Usage: verify.sh launch|doctor|stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PORT="${VERIFY_PORT:-3939}"
STATE="$ROOT/.verify"          # pid + log (gitignored via .verify/)
mkdir -p "$STATE"

doctor() {
  local pid; pid="$(cat "$STATE/dev.pid" 2>/dev/null || true)"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null || { echo "FAIL: no dev server started by verify.sh"; return 1; }
  # port must belong to our process tree, not someone else's dev server
  local owner; owner="$(lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN | head -1 || true)"
  [[ -n "$owner" ]] || { echo "FAIL: nothing listening on $PORT"; return 1; }
  local p="$owner"; while [[ "$p" -gt 1 && "$p" != "$pid" ]]; do p="$(ps -o ppid= -p "$p" | tr -d ' ')"; done
  [[ "$p" == "$pid" ]] || { echo "FAIL: port $PORT owned by pid $owner, not our server $pid"; return 1; }
  local html; html="$(curl -fsS "http://localhost:$PORT/")" || { echo "FAIL: GET / failed"; return 1; }
  local n; n="$(grep -o 'id="gallery-[^"]*"' <<<"$html" | wc -l | tr -d ' ')"
  [[ "$n" -gt 0 ]] || { echo "FAIL: SSR html has no gallery items"; return 1; }
  echo "OK: http://localhost:$PORT pid=$pid gallery_items=$n rev=$(git -C "$ROOT" rev-parse --short HEAD)$(git -C "$ROOT" diff --quiet || echo '+dirty')"
}

case "${1:-}" in
  launch)
    if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
      echo "Port $PORT already in use; refusing to double-drive. Run 'verify.sh doctor' or set VERIFY_PORT." >&2; exit 1
    fi
    (cd "$ROOT" && nohup pnpm exec nuxt dev --port "$PORT" >"$STATE/dev.log" 2>&1 & echo $! >"$STATE/dev.pid")
    for _ in $(seq 1 90); do
      if doctor >/dev/null 2>&1; then doctor; exit 0; fi
      sleep 2
    done
    echo "FAIL: not ready after 180s; tail of $STATE/dev.log:" >&2; tail -30 "$STATE/dev.log" >&2; exit 1 ;;
  doctor) doctor ;;
  stop)
    pid="$(cat "$STATE/dev.pid" 2>/dev/null || true)"
    # nuxt dev forks a worker as a grandchild, so walk the whole tree we started
    tree() { local c; for c in $(pgrep -P "$1"); do tree "$c"; done; echo "$1"; }
    if [[ -n "$pid" ]]; then kill -TERM $(tree "$pid") 2>/dev/null || true; fi
    rm -f "$STATE/dev.pid"
    for _ in $(seq 1 10); do lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break; sleep 1; done
    lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 && echo "WARN: port $PORT still listening" >&2
    echo "stopped (evidence kept in $STATE/evidence)" ;;
  *) echo "usage: $0 launch|doctor|stop" >&2; exit 2 ;;
esac
