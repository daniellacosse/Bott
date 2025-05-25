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

## Architecture

```mermaid
graph LR
  subgraph "External Services"
    DiscordPlatform["Discord Platform"]
    GeminiPlatform["Google Gemini Platform"]
  end

  subgraph "Bott System"
    DiscordHelpers["Discord Helpers<br>(@bott/discord)<br>Manages Discord interactions, event parsing, response formatting"]
    GeminiHelpers["Gemini Helpers<br>(@bott/gemini)<br>Interfaces with Gemini API, handles AI requests, file generation"]
    subgraph "Application Core"
      AppLayer["App Layer<br>(app/main.ts, app/commands/*)<br>Handles command logic, orchestrates tasks"]
      DataLayer["Data Layer<br>(data/model/*, data/database/*)<br>Manages data persistence (DB, file system)"]
    end
  end

  %% Flow from Discord User to Bot and back
  DiscordPlatform -- User Interaction (e.g., Slash Command) --> DiscordHelpers
  DiscordHelpers -- Parsed Event/Command --> AppLayer
  AppLayer -- Requests AI Processing / File Generation --> GeminiHelpers
  GeminiHelpers -- Calls Gemini API --> GeminiPlatform
  GeminiPlatform -- AI Model Response / Generated Data --> GeminiHelpers
  GeminiHelpers -- AI Result / File --> AppLayer
  AppLayer -- Data Storage / Retrieval --> DataLayer
  DataLayer -- Data --> AppLayer
  AppLayer -- Response Data (Text, Embeds, Files) --> DiscordHelpers
  DiscordHelpers -- Formatted Bot Reply --> DiscordPlatform
```
