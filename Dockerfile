FROM denoland/deno:latest

# COPY ./gcp-key.json /etc/gcp/gcp-key.json
COPY ./deno.json ./deno.lock* ./
COPY ./app /app
COPY ./helpers /helpers
COPY ./data /data

EXPOSE 8080

CMD ["deno", "task", "start:app"]
