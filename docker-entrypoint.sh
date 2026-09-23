#!/bin/sh
set -e
# Minimal entrypoint that just execs the CMD (bypasses the official node entrypoint issues)
exec "$@"
