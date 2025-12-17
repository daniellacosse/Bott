# Bott Architecture

> [!TIP]
> Click on the links in the diagram below to navigate to a specific component's
> documentation.

> [!WARNING]
> The following diagram is somewhat outdated and will be updated soon. Bott has
> migrated to more of a pseudo-services architecture.

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

## Configuration

Bott is configured via a series of environment variables. For a full list,
descriptions, and default values, please refer to the
[constants.ts](./constants.ts) file.

## Event Generation

Bott processes incoming messages and events through a complicated multi-step
process to avoid undue chatter. For a more detailed breakdown of this process
_(currently implemented via Gemini - see:
**[Gemini Event Pipeline documentation](./libraries/gemini/events)**)_.
