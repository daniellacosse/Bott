FROM denoland/deno:latest

WORKDIR /app

COPY ./gcp-key.json /etc/gcp/gcp-key.json

COPY ./deno.json ./deno.lock* ./

COPY ./app .

COPY ./infra /infra

CMD ["deno", "task", "start"]
