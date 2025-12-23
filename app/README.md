# Bott Application Layer

This directory contains the core application logic for Bott. It serves as the
bridge between the chat space and the AI model(s). Currently, these are
respectively:

- [Discord](../libraries/chatSpaces/discord/README.md)
- [Gemini](../libraries/aiModels/gemini/README.md)

It also orchestrates [Storage](../libraries/system/storage/README.md).

## Core Components

- **[entry point] [`main.ts`](./main.ts)**: Initializes the bot, sets up the
  storage connection, and handles the main event loop. It listens for Discord
  events, persists them, and triggers the AI generation process.
- **[`service/`](./service/)**: Contains the application logic for handling
  events and actions.
- **[`settings/`](./settings/)**: Defines Bott's "Soul" – its identity, core
  directives, and the rules (Reasons) it uses to evaluate inputs and outputs.
