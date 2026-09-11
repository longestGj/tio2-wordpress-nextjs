FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3 docker.io age nginx sudo curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN useradd --create-home deploy
CMD ["sleep", "infinity"]
