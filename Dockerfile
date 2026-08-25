# syntax=docker/dockerfile:1
# Multi-stage: Vite SPA → Flask + Gunicorn (SQLite + uploads on /data).

FROM node:22-bookworm-slim AS frontend
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Deux builds : l'interface d'administration (déplacée avant, car le build
# Vite vide dist/) puis le site applicatif servi à la racine.
RUN VITE_ADMIN=1 BASE_PATH=/gestion/ npm run build && mv dist admin-dist
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=5000 \
    TWOLATE_FRONTEND_DIST=/app/frontend/dist \
    TWOLATE_ADMIN_DIST=/app/frontend/admin-dist \
    TWOLATE_DB=/data/2late.db \
    TWOLATE_UPLOADS=/data/uploads

WORKDIR /app

COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt \
    && useradd --create-home --uid 10001 --shell /usr/sbin/nologin twolate \
    && mkdir -p /data/uploads

COPY backend /app/backend
COPY --from=frontend /src/frontend/dist /app/frontend/dist
COPY --from=frontend /src/frontend/admin-dist /app/frontend/admin-dist

RUN chown -R twolate:twolate /app /data

USER twolate
EXPOSE 5000
WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\",\"5000\")}/api/health')"

CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT:-5000} --workers 1 --threads 8 --timeout 60 --access-logfile - --error-logfile - wsgi:app"]
