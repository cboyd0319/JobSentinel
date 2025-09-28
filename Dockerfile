FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./
RUN chmod +x cloud/run_job_entrypoint.sh

ENTRYPOINT ["/bin/sh", "cloud/run_job_entrypoint.sh"]
