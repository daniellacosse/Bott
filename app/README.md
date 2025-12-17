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

## Version Management

The application version is defined in [`deno.jsonc`](./deno.jsonc) and follows
[Semantic Versioning](https://semver.org/).

### Bumping the Version

To update the version number:

1. Open [`deno.jsonc`](./deno.jsonc) in the `app` directory
2. Update the `version` field:
   ```jsonc
   {
     "name": "Bott",
     "version": "0.1.0", // Update this field
     "main": "./main.ts"
   }
   ```
3. Follow semantic versioning guidelines:
   - **Major** (X.0.0): Breaking changes or major feature releases
   - **Minor** (0.X.0): New features, backward compatible
   - **Patch** (0.0.X): Bug fixes and minor changes
   - **Pre-release** (0.0.0-alpha, 0.0.0-beta): Development versions

The version is automatically displayed in the help command footer and other
areas of the application.
