FROM denoland/deno:latest

WORKDIR /app

COPY ./deno.json ./deno.lock* ./
COPY ./app .
COPY ./helpers /helpers
COPY ./data /data

EXPOSE 8080

CMD ["deno", "task", "start"]
