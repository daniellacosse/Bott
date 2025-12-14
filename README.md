<img src="assets/avatar.jpg" width="128" />

# `@Bott`

![GitHub Checks](https://github.com/daniellacosse-code/Bott/actions/workflows/qualityChecks.yml/badge.svg)
[![Maintainability](https://qlty.sh/gh/daniellacosse-code/projects/Bott/maintainability.svg)](https://qlty.sh/gh/daniellacosse-code/projects/Bott)
[![Code Coverage](https://qlty.sh/gh/daniellacosse-code/projects/Bott/coverage.svg)](https://qlty.sh/gh/daniellacosse-code/projects/Bott)
[![Discord](https://img.shields.io/discord/1294993662534483978)](https://DanielLaCos.se)

An autonomous groupchat agent.

> [!CAUTION]
>
> 🛑 ![in development](https://img.shields.io/badge/in%20development-red) 🛑
>
> **Currently in development:** see the
> [alpha release milestone](https://github.com/daniellacosse-code/Bott/milestone/2).
> Use at your own risk.

## Current Features

- Bott uses a pre-configured
  [`Identity`](./app/settings/identity.md.ejs) and
  [`Reasons`](./app/settings/reasons.ts) to determine when to
  engage with server members.
- They view and can discuss most types of media posted in chat. _(See:
  [Supported Attachment Types](./model/types/events.ts))_
- They asynchronously perform tasks as requested:
  - Generates photos, movies, songs and essays as requested.
  - _(TBD)_

### Supported Integrations

#### Chat Clients

- [Discord](./libraries/discord)

#### AI Models

- [Gemini](./libraries/gemini)

## High-level Architecture

> [!TIP]
> Click on the links in the diagram below to navigate to a specific component's
> documentation.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'lineColor': '#5e5e5e', 'fontSize': '14px' }}}%%
flowchart TD
  subgraph Model["<a href='https://github.com/daniellacosse-code/Bott/tree/main/model'>**@bott/model**</a>"]
    BottDiscord["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/discord'>**@bott/discord**</a>"]
    
    subgraph App["<a href='https://github.com/daniellacosse-code/Bott/tree/main/app'>./app</a>"]
      BottAppLayer["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/task'>**@bott/task**</a>"]
      BottDataLayer["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/storage'>**@bott/storage**</a><br>Persistence layer"]
      
      BottAppLayer --> BottDataLayer
      BottDataLayer --> BottAppLayer
    end
    
    BottGemini["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/gemini'>**@bott/gemini**</a>"]
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

  style App fill:#f2896f,color:black,stroke:#333,stroke-width:2px
  style Model fill:#c7e2e2,color:black,stroke:#333,stroke-width:2px
```

### Configuration

Bott is configured via a series of environment variables. For a full list,
descriptions, and default values, please refer to the
[constants.ts](./constants.ts) file.

### Event Generation

Bott processes incoming messages and events through a complicated multi-step
process to avoid undue chatter. For a more detailed breakdown of this process
_(currently implemented via Gemini - see:
**[Gemini Event Pipeline documentation](./libraries/gemini/events)**)_.

## Contributing

**Interested in contributing?** See our [Contribution Guide](./CONTRIBUTING.md)!

## Gallery

<table>
  <tr>
    <td>
      <figure>
        <img width="360" alt="origin_of_bott" src="assets/origin.png" />
        <br />
        <figcaption><i>Bott's origin</i></figcaption>
      </figure>
    </td>
    <td>
      <figure>
        <img width="360" src="assets/concept.png" alt="concept" />
        <br />
        <figcaption><i>Concept art by <a href="https://DanielLaCos.se">DanielLaCos.se</a></i></figcaption>
      </figure>
    </td>
  </tr>
</table>

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
