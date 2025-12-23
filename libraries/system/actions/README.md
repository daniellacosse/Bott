# System: Actions

This library defines the core types and utilities for the Bott Action system.
Actions are the primary way Bott interacts with the world and performs tasks.

## Key Types

- **[`BottAction`](./types.ts)**: Represents a distinct capability of the bot (a
  "tool"). It combines a unique name, configuration settings, and an execution
  function.
- **[`BottActionFunction`](./types.ts)**: The implementation of the action. It
  is an async generator that yields `BottEvent`s (e.g., status updates,
  intermediate results) and eventually completes.
- **[`BottActionSettings`](./types.ts)**: Configuration for an action,
  including:
  - `name`: Unique identifier.
  - `instructions`: Description for the AI model on how/when to use it.
  - `parameters`: JSON Schema-like definition of arguments.
  - `limitPerMonth`: Rate limiting configuration.

## Usage

Actions are registered with the `ActionService` (or other services) and can be
invoked by the AI models or system events.
