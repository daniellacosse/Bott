#!/bin/sh

source .env.production

docker buildx build --platform linux/amd64 -t bott .
docker tag bott us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest
docker push us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest

gcloud run deploy bott-service \
  --image us-central1-docker.pkg.dev/$GOOGLE_PROJECT_ID/bot-farm/bott:latest \
  --region us-central1 \
  --project $GOOGLE_PROJECT_ID \
  --cpu 1 \
  --cpu-boost \
  --memory 1.5Gi \
  --min-instances 0 \
  --max-instances 1 \
  --execution-environment gen2 \
  --add-volume=name=bott-data-volume,type=cloud-storage,bucket=bott-data \
  --add-volume-mount=volume=bott-data-volume,mount-path=$FILE_SYSTEM_ROOT \
  --set-env-vars FILE_SYSTEM_ROOT=$FILE_SYSTEM_ROOT \
  --set-env-vars DISCORD_TOKEN=$DISCORD_TOKEN \
  --set-env-vars GOOGLE_PROJECT_LOCATION=$GOOGLE_PROJECT_LOCATION \
  --set-env-vars GOOGLE_PROJECT_ID=$GOOGLE_PROJECT_ID \
  --set-env-vars GOOGLE_ACCESS_TOKEN=$GOOGLE_ACCESS_TOKEN \
  --set-env-vars CONFIG_RATE_LIMIT_VIDEOS=$CONFIG_RATE_LIMIT_VIDEOS \
  --set-env-vars CONFIG_RATE_LIMIT_MUSIC=$CONFIG_RATE_LIMIT_MUSIC \
  --set-env-vars CONFIG_RATE_LIMIT_IMAGES=$CONFIG_RATE_LIMIT_IMAGES \
  --allow-unauthenticated
