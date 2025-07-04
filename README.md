<img width="360" alt="Screenshot 2025-04-26 at 12 19 21" src="https://github.com/user-attachments/assets/71c13505-5758-4202-8612-8a7f79f4fba0" />

# 🤖 `@Bott`

![in development](https://img.shields.io/badge/development%20in%20development-blue)
![github checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
[![discord](https://img.shields.io/discord/1294993662534483978)](https://DanielLaCos.se)

A Discord bot, powered by Gemini.

## Features

- Engages with server members when appropriate, taking channel context into
  consideration.
- Views and discusses media posted in chat.
  - Supports reading JPEGs, PNGs, and most websites.
  - Experimental support for MP4s, GIFs, WAVs and MP3 files.
- Generates images, videos and audio as requested.
- Translates technical errors into user-friendly language, when appropriate.

## Development

> [!NOTE]
> Interested in contributing? See our [Contribution Guide](./CONTRIBUTING.md)!

### Getting started

#### Prerequisites

- Homebrew ([https://brew.sh/](https://brew.sh/))
- GCP Project
  ([https://developers.google.com/workspace/guides/create-project](https://developers.google.com/workspace/guides/create-project))
- Discord Application
  ([https://discord.com/developers/applications](https://discord.com/developers/applications))

#### Instructions

1. Copy `.env.example` to `.env.development`:

```sh
cp .env.example .env.development
```

3. Get your GCP information and add it to `.env.development`.
4. Get your Discord information and add it to `.env.development`.
5. Set up the environment with `deno task setup`.
6. Start Bott with `deno task start:dev`.

### Configuring Bott

Bott is configured via a series of environment variables.

| Name                                | Description                                                                                                               | Default     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `CONFIG_ASSESSMENT_SCORE_THRESHOLD` | The minimum score (1-100) a potential response must achieve in quality assessments (e.g., novelty, relevance) to be sent. | 70          |
| `CONFIG_INPUT_EVENT_LIMIT`          | The maximum number of past chat events to include in the context for the AI model.                                        | 2000        |
| `CONFIG_INPUT_FILE_TOKEN_LIMIT`     | The maximum number of tokens to use for analyzing the content of input files (images, websites).                          | 500000      |
| `CONFIG_RATE_LIMIT_IMAGES`          | The maximum number of images Bott can generate per month.                                                                 | 100         |
| `CONFIG_RATE_LIMIT_MUSIC`           | The maximum number of songs Bott can generate per month.                                                                  | 25          |
| `CONFIG_RATE_LIMIT_VIDEOS`          | The maximum number of videos Bott can generate per month.                                                                 | 10          |
| `DISCORD_TOKEN`                     | The authentication token for your Discord bot application.                                                                | -           |
| `FILE_SYSTEM_ROOT`                  | The root directory on the local file system for storing input and output files.                                           | `./fs_root` |
| `GOOGLE_ACCESS_TOKEN`               | An access token for authenticating with Google Cloud APIs.                                                                | -           |
| `GOOGLE_PROJECT_ID`                 | The ID of your Google Cloud project.                                                                                      | -           |
| `GOOGLE_PROJECT_LOCATION`           | The GCP region where your Vertex AI resources are located (e.g., `us-central1`).                                          | -           |
| `PORT`                              | The port of the health check server required for GCP Cloud Run.                                                           | 8080        |

### Deploying Bott

Due to the nature of the Vertex AI API, Bott supports only GCP.

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?git_repo=https://github.com/daniellacosse-code/Bott.git)

### High-level Architecture

> [!TIP]
> Review the code data model annotated in [./model/types.ts](./model/types.ts).

```mermaid
graph TD
  subgraph "@bott/model"
    BottDiscord["**@bott/discord**"]
    
    subgraph App["./app"]
      BottAppLayer["**@bott/task**"]
      BottDataLayer["**@bott/storage**<br>Persistence layer"]
      
      BottAppLayer --> BottDataLayer
      BottDataLayer --> BottAppLayer
    end
    
    BottGemini["**@bott/gemini**"]
  end

  %% Flow from Discord User to Bot and back
  Discord -- "User Message" --> BottDiscord
  BottDiscord -- "BottEvent" --> App
  App -- "BottEvent" --> BottGemini
  BottGemini -- "Calls Gemini API" --> Gemini
  Gemini -- "Generated Data" --> BottGemini
  BottGemini -- "BottEvent" --> App
  App -- "BottEvent" --> BottDiscord
  BottDiscord -- "System Message" --> Discord

  style App fill:darkblue;
```

---

## Licensing

This project is **dual-licensed** (pending legal review):

- **For Non-Commercial Use:** This software is free and open-source under the
  terms of the **GNU Affero General Public License v3.0 (AGPLv3)**.
  - Read the full AGPLv3 license details in the [LICENSE file](./LICENSE).

- **For Commercial Use:** If you intend to use this software for commercial
  purposes (any use directly or indirectly intended for commercial advantage or
  monetary compensation), you are required to obtain a **Proprietary Commercial
  License**. Contact me at [D@nielLaCos.se](mailto:d@niellacosse.se) for
  commercial licensing inquiries.

**Copyright (C) 2025 DanielLaCos.se**
