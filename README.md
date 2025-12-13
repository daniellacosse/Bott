# <img src="assets/avatar.jpg" width="49" /> `@Bott`

[![Maintainability](https://qlty.sh/gh/daniellacosse-code/projects/Bott/maintainability.svg)](https://qlty.sh/gh/daniellacosse-code/projects/Bott)
![github checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
[![discord](https://img.shields.io/discord/1294993662534483978)](https://DanielLaCos.se)

An autonomous groupchat agent.

---

> [!CAUTION]
>
> 🛑 ![in development](https://img.shields.io/badge/in%20development-red) 🛑
>
> **Currently in development:** see the
> [alpha release milestone](https://github.com/daniellacosse-code/Bott/milestone/2).
> Use at your own risk.

## Current Features

- Uses its pre-configured `Identity` and `Reasons` to determine when to engage
  with server members.
- Views and discusses most types of media posted in chat. (See
  [Media Support](#media-support))
- Asynchronously performs tasks as requested:
  - Generates photos, movies, songs and essays as requested.
  - _(TBD)_

### Supported Integrations

#### Chat Clients

- [Discord](./libraries/discord)

#### AI Models

- [Gemini](./libraries/gemini)

## Development

> [!NOTE]
> Interested in contributing? See our [Contribution Guide](./CONTRIBUTING.md)
> for contribution guidelines and the development guide!

### High-level Architecture

> [!TIP]
> Click on the components in the diagram below to navigate to their
> documentation.

```mermaid
flowchart TD
  subgraph Model["<a href='./model'>**@bott/model**</a>"]
    BottDiscord["<a href='./libraries/discord'>**@bott/discord**</a>"]
    
    subgraph App["<a href='./app'>./app</a>"]
      BottAppLayer["<a href='./libraries/task'>**@bott/task**</a>"]
      BottDataLayer["<a href='./libraries/storage'>**@bott/storage**</a><br>Persistence layer"]
      
      BottAppLayer --> BottDataLayer
      BottDataLayer --> BottAppLayer
    end
    
    BottGemini["<a href='./libraries/gemini'>**@bott/gemini**</a>"]
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

  style App fill:#f2896f;
  style Model fill:#c7e2e2;
```

#### Event Generation

Bott processes incoming messages and events through complicated multi-step to
avoid undue chatter. For a more detailed breakdown of this process (currently
implemented via Gemini), see the
**[Gemini Event Pipeline documentation](./libraries/gemini/events/README.md)**.

## Gallery

<figure>
  <img width="360" alt="origin_of_bott" src="assets/origin.png" />
  <figcaption>Bott's origin</figcaption>
</figure>

<figure>
  <img width="360" src="assets/concept.png" alt="concept" />
  <figcaption>concept art by DanielLaCos.se</figcaption>
</figure>

## Licensing

This project is **dual-licensed**. This model allows for free, open-source use
for non-commercial purposes while requiring a separate license for commercial
applications.

- **For Non-Commercial Use:** This software is free and open-source under the
  terms of the **GNU Affero General Public License v3.0 (AGPLv3)**.
  - Read the full AGPLv3 license details in the [LICENSE file](./LICENSE).

- **For Commercial Use:** Use of this software for any purpose that is intended
  for commercial advantage or monetary compensation requires a **Proprietary
  Commercial License**. Please contact [D@nielLaCos.se](mailto:d@niellacos.se)
  to discuss licensing terms.

**Copyright (C) 2025 DanielLaCos.se**
