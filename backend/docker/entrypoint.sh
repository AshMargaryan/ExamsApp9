#!/usr/bin/env bash
set -euo pipefail

echo "Waiting for database at ${DB_HOST}:${DB_PORT}..."
until python - <<'PYEOF'
import os
import sys

import psycopg2

try:
    psycopg2.connect(
        dbname=os.environ["DB_NAME"],
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASSWORD"],
        host=os.environ["DB_HOST"],
        port=os.environ["DB_PORT"],
    ).close()
except psycopg2.OperationalError:
    sys.exit(1)
PYEOF
do
  echo "Database not ready yet — retrying in 1s..."
  sleep 1
done
echo "Database is up."

if [ "${DJANGO_MANAGE_MIGRATE:-true}" = "true" ]; then
  echo "Applying database migrations..."
  python manage.py migrate --noinput
fi

if [ "${DJANGO_SEED_CONTENT:-true}" = "true" ]; then
  python manage.py seed_content_if_empty
fi

if [ "${DJANGO_COLLECTSTATIC:-false}" = "true" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

exec "$@"