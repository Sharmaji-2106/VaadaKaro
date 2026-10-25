FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv

COPY requirements.txt .
# uvicorn[standard] adds uvloop/httptools for production throughput (wheels exist for 3.12).
RUN pip install -r requirements.txt "uvicorn[standard]"

COPY app ./app

RUN useradd --create-home appuser
USER appuser

# Cloud Run / Render / Koyeb inject $PORT. X-Forwarded-For is deliberately not trusted: the frontend
# reports the client IP with PROXY_SHARED_SECRET instead (see app/core/rate_limit.py).
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --no-proxy-headers"]
