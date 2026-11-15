#!/usr/bin/env bash
STATE="$(cd "$(dirname "$0")/.." && pwd)/.local"
[ -f "$STATE/pids" ] && xargs kill < "$STATE/pids" 2>/dev/null; rm -f "$STATE/pids"; echo "local harness down"
