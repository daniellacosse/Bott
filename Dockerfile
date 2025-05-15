FROM denoland/deno:latest

WORKDIR /app

# COPY ./gcp-key.json /etc/gcp/gcp-key.json
COPY ./deno.json ./deno.lock* ./
COPY ./app .
COPY ./helpers /helpers
COPY ./data /data

EXPOSE 8080

CMD ["deno", "task", "start"]
