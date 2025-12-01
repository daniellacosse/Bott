FROM denoland/deno:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmp3lame-dev \
    libx265-dev && \
    rm -rf /var/lib/apt/lists/*

COPY ./deno.jsonc ./deno.lock* ./
COPY ./app /app
COPY ./libraries /libraries
COPY ./model /model

EXPOSE 8080

CMD ["deno", "task", "start:prod"]
