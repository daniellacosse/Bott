# Bott Application Layer

This directory contains the core application logic for Bott. It serves as the
bridge between the chat space and the AI model(s). Currently, these are
respectively:

- [Discord](../libraries/discord/README.md)
- [Gemini](../libraries/gemini/README.md)

It also orchestrates [Storage](../libraries/storage/README.md).

## Core Components

- **[entry point] [`main.ts`](./main.ts)**: Initializes the bot, sets up the
  storage connection, and handles the main event loop. It listens for Discord
  events, persists them, and triggers the AI generation process.
- **[`actions/`](./actions/)**: Contains handlers for AI-triggered actions (Tool
  Calls).
  - e.g., [`generateMedia.ts`](./actions/generateMedia.ts): Handles requests to
    generate images, videos, or music.
- **[`defaultGlobalSettings/`](./defaultGlobalSettings/)**: Defines the "Soul"
  of the bot – its identity, core directives, and the rules (Reasons) it uses to
  evaluate inputs and outputs.
