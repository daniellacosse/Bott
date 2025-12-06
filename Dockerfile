FROM denoland/deno:latest

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmp3lame-dev \
    libx265-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY ./deno.jsonc ./deno.lock* ./
COPY ./app ./app
COPY ./libraries ./libraries
COPY ./model ./model

ENV PORT=8080
EXPOSE $PORT

CMD ["deno", "run", "--allow-all", "./app/main.ts"]
