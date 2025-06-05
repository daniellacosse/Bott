FROM denoland/deno:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmp3lame0 \
    libx265-199 && \
    rm -rf /var/lib/apt/lists/*

USER deno
COPY ./deno.json ./deno.lock* ./
COPY ./app /app
COPY ./helpers /helpers
COPY ./model /model

EXPOSE 8080

CMD ["deno", "task", "start:app"]
