# Multi-stage Dockerfile for Returns Manager (Cube Buildathon 04)
# Builds React UI and runs FastAPI backend in a single high-performance container

# ── Stage 1: Build Frontend ─────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/ui

# Install dependencies
COPY ui/package*.json ./
RUN npm ci

# Copy UI source and build production bundle
COPY ui/ ./
RUN npm run build

# ── Stage 2: Python Backend Runtime ─────────────────
FROM python:3.12-slim AS runner
WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    RM_ENV=demo \
    DATABASE_URL=""

# Install system libraries needed by OpenCV (headless) and barcode scanning
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Install Python dependencies
COPY agent/pyproject.toml agent/uv.lock ./agent/
WORKDIR /app/agent
RUN uv sync --frozen --no-dev --no-install-project

# Copy agent source code and internal contract
COPY agent/src ./src
COPY agent/migrations ./migrations
COPY agent/prompts ./prompts
COPY agent/README.md ./
COPY agent/contract ./contract
COPY agent/manual_test_images ./manual_test_images
RUN uv sync --frozen --no-dev

# Copy operational reference, catalogue, and test fixtures
WORKDIR /app
COPY data ./data
COPY reference ./reference
COPY fixtures ./fixtures

# Copy built frontend assets from Stage 1 into /app/ui/dist
COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Expose port (Render sets $PORT dynamically)
EXPOSE 8000

# Start Uvicorn ASGI server
CMD ["sh", "-c", "uv run --directory agent python -m uvicorn returns_manager.api.app:create_app --factory --host 0.0.0.0 --port ${PORT:-8000}"]
