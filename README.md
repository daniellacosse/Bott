<img width="360" alt="Screenshot 2025-04-26 at 12 19 21" src="https://github.com/user-attachments/assets/71c13505-5758-4202-8612-8a7f79f4fba0" />

# 🤖 `@Bott`

![in progress](https://img.shields.io/badge/development%20in%20progress-blue)
![github checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
![discord](https://img.shields.io/discord/1294993662534483978)

A Discord Bot, powered by Gemini.

## Getting started (WIP)

Duplicate `.env.example` to `.env.development` and fill it out.

Then run:

```sh
brew bundle
gcloud auth login
deno task start:app
```

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run?git_repo=https://github.com/daniellacosse-code/Bott.git)

## Architecture (WIP)

Review the code data model annotated in [./model/types.ts](./model/types.ts).

_(Diagram not yet entirely accurate: all modules code up to the @bott/model)_

```mermaid
graph LR
  subgraph "External Services"
    DiscordPlatform["Discord Platform"]
    GeminiPlatform["Google Gemini Platform"]
  end

  subgraph "Bott System"
    BottDiscord["Discord Libraries<br>(@bott/discord)<br>Adapts Discord events, sends replies"]
    
    subgraph "Application Core"
      direction TB
      BottAppLayer["App Layer<br>(Command Logic, Orchestration)<br>Handles core bot logic, uses services"]
      BottDataLayer["Data Layer<br>(@bott/storage, @bott/model)<br>Manages data persistence and models"]
      
      BottAppLayer -- "Data Storage / Retrieval" --> BottDataLayer
      BottDataLayer -- "Data" --> BottAppLayer
    end
    
    BottGemini["Gemini Libraries<br>(@bott/gemini)<br>Interfaces with Gemini, processes AI tasks"]
  end

  %% Flow from Discord User to Bot and back
  DiscordPlatform -- "User Interaction (e.g., Slash Command)" --> BottDiscord
  BottDiscord -- "Parsed Event/Command" --> BottAppLayer
  BottAppLayer -- "Requests AI Processing / File Generation" --> BottGemini
  BottGemini -- "Calls Gemini API" --> GeminiPlatform
  GeminiPlatform -- "AI Model Response / Generated Data" --> BottGemini
  BottGemini -- "AI Result / File" --> BottAppLayer
  BottAppLayer -- "Response Data (Text, Embeds, Files)" --> BottDiscord
  BottDiscord -- "Formatted Bot Reply" --> DiscordPlatform
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
