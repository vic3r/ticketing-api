#!/usr/bin/env bash
# Generate self-signed TLS certs for local HTTPS (Traefik).
# Run from repo root: ./scripts/gen-certs.sh

set -e
mkdir -p certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=localhost/O=Ticketing/C=US"
chmod 644 certs/server.crt certs/server.key
echo "Generated certs/server.crt and certs/server.key"
