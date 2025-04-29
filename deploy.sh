#!/bin/sh

source .env

docker buildx build --platform linux/amd64 -t bott .
docker tag bott us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest
docker push us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest

gcloud run deploy bott-service \
  --image us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest \
  --region us-central1 \
  --project $GOOGLE_PROJECT_ID \
  --cpu 1 \
  --cpu-boost \
  --memory 2Gi \
  --min-instances 1 \
  --max-instances 1 \
  --set-env-vars DISCORD_TOKEN=$DISCORD_TOKEN \
  --set-env-vars GOOGLE_PROJECT_ID=$GOOGLE_PROJECT_ID \
  --set-env-vars GOOGLE_PROJECT_LOCATION=$GOOGLE_PROJECT_LOCATION \
  --set-env-vars CONFIG_PROACTIVE_REPLY_CHANCE=$CONFIG_PROACTIVE_REPLY_CHANCE \
  --set-env-vars CONFIG_HISTORY_LENGTH=$CONFIG_HISTORY_LENGTH \
  --set-env-vars CONFIG_RATE_LIMIT_VIDEOS=$CONFIG_RATE_LIMIT_VIDEOS \
  --set-env-vars CONFIG_RATE_LIMIT_IMAGES=$CONFIG_RATE_LIMIT_IMAGES \
  --allow-unauthenticated
