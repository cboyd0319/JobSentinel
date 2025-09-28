FROM python:3.12.10-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN addgroup --system app && adduser --system --ingroup app app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
RUN chmod +x cloud/run_job_entrypoint.sh && chown -R app:app /app

USER app

ENTRYPOINT ["/bin/sh", "cloud/run_job_entrypoint.sh"]
