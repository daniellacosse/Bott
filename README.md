# `@Bott`

A Discord Bot, powered by Gemini.

<img width="465" alt="Screenshot 2025-04-26 at 12 19 21" src="https://github.com/user-attachments/assets/71c13505-5758-4202-8612-8a7f79f4fba0" />

## Getting started

Duplicate `.env.example` to `app/.env.development` and fill it out.

Then run:

```sh
brew bundle
gcloud auth login
deno task start:app
```

## Deploy

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?git_repo=https://github.com/daniellacosse-code/Bott.git)

Duplicate `.env.example` to `.env.production` and fill it out.

```sh
deno task deploy
```

You can also run the Dockerfile locally with `deno task start`.
