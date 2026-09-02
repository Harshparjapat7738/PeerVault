#!/bin/sh
# Seeds dev secrets into Vault's KV v2 engine at secret/application, which Config Server's vault
# composite backend serves as global defaults to every service (same convention as config-repo/application.yml
# for non-secret config). Vault runs in dev mode, so this needs to run again after every container restart —
# docker-compose runs this as a short-lived one-shot service that exits once seeding is done.
#
# The MongoDB Atlas connection string is NOT a Vault secret — it is deliberately sourced from
# backend/.env (MONGODB_URI) straight into each service's container environment instead. See
# backend/.env.example.
set -e

export VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
export VAULT_TOKEN="${VAULT_TOKEN:-peervault-dev-root-token}"

until vault status >/dev/null 2>&1; do
  echo "Waiting for Vault at $VAULT_ADDR..."
  sleep 2
done

vault kv put secret/application \
  jwt.secret="${JWT_SECRET:-cGVlcnZhdWx0LWRldi1zdXBlci1zZWNyZXQtc2lnbmluZy1rZXktcGxlYXNlLXJvdGF0ZS0zMmI=}"

echo "Vault seeded: secret/application (jwt.secret)"
