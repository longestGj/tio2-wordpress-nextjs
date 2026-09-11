# Local SSH controller integration fixture only.
FROM tio2-update-runtime:task3
RUN apt-get update && apt-get install -y --no-install-recommends openssh-server && rm -rf /var/lib/apt/lists/*
LABEL tio2.task4="controller-rehearsal"
