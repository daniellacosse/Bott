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
  ServicesManager(ServicesManager)
  
  subgraph Services
    direction TB
    DiscordService["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/chatSpaces/discord'>**DiscordService**</a><br>(Input/Output)"]
    AppService["<a href='https://github.com/daniellacosse-code/Bott/tree/main/app/service'>**AppService**</a><br>(Core Logic)"]
    ActionService["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/system/actions'>**ActionService**</a><br>(Tool Execution)"]
    StorageService["<a href='https://github.com/daniellacosse-code/Bott/tree/main/libraries/system/storage'>**EventStorageService**</a><br>(Persistence)"]
  end
  
  subgraph External
    DiscordAPI(Discord API)
    GeminiAPI(Gemini API)
    DB[(SQLite)]
  end

  ServicesManager --> DiscordService
  ServicesManager --> AppService
  ServicesManager --> ActionService
  ServicesManager --> StorageService

  DiscordService <--> DiscordAPI
  DiscordService -- "BottEvent" --> AppService
  
  AppService -- "Saves Events" --> StorageService
  StorageService <--> DB
  
  AppService -- "Calls Actions" --> ActionService
  ActionService -- "Uses" --> GeminiAPI
  ActionService -- "Result" --> AppService
  
  AppService -- "Response" --> DiscordService

  style AppService fill:#f2896f,color:black
  style ServicesManager fill:#c7e2e2,color:black
```

## Configuration

Bott is configured via a series of environment variables. For a full list,
descriptions, and default values, please refer to the
[constants.ts](./constants.ts) file.

## Event Generation

Bott processes incoming messages and events through a complicated multi-step
process to avoid undue chatter.

For a more detailed breakdown of this process _(currently implemented via
Gemini - see:
**[Gemini Event Pipeline documentation](./libraries/aiModels/gemini/events)**)_.
