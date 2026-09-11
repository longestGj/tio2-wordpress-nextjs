# Local rehearsal tools only; this is not a production website image.
FROM tio2-backup-runtime:task2
RUN apt-get update && apt-get install -y --no-install-recommends docker-buildx && rm -rf /var/lib/apt/lists/*
