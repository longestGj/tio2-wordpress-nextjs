ARG RUNTIME_BASE=debian:bookworm-slim
FROM ${RUNTIME_BASE}
RUN if ! command -v python3 || ! command -v docker; then apt-get update && apt-get install -y --no-install-recommends python3 docker.io ca-certificates && rm -rf /var/lib/apt/lists/*; fi
LABEL d16.test.runtime="content-install-resources-v1"
ENTRYPOINT ["python3", "/inputs/rehearsal.py"]
