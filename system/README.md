# System Library

The `@bott/system` library is the core of the Bott ecosystem. It defines the
fundamental data structures, interfaces, and infrastructure for events, actions,
and services.

This library is designed to be:

- **Unified**: All core types are defined here to ensure consistency.
- **Decoupled**: Services and actions communicate via events, minimizing direct
  dependencies.
- **Type-Safe**: Comprehensive TypeScript definitions for all constructs.

## 1. Events

Events are the atomic units of information flow in Bott. Everything from a user
message to an AI thought is modeled as a `BottEvent`.

### Key Types

- **[`BottEvent<T>`](./types.ts)**: The universal envelope for all occurrences.
- **[`BottEventType`](./types.ts)**: Enumeration of all known event types (e.g.,
  `MESSAGE`, `ACTION_CALL`).
- **[`BottEventAttachment`](./types.ts)**: Represents media or files attached to
  an event.

### Usage

Events are dispatched by services and actions, and consumed by listeners
registered on the `SystemManager`.

## 2. Actions

Actions represent the distinct capabilities (or "tools") of the bot.

### Key Types

- **[`BottAction`](./types.ts)**: A capability combining a name, settings, and
  an execution function.
- **[`BottActionFunction`](./types.ts)**: The implementation of the action, an
  async generator yielding `BottEvent`s.
- **[`BottActionSettings`](./types.ts)**: Configuration including instructions
  for the AI and parameter schemas.

### execution

Actions are invoked by the `ActionService` upon receiving an `ACTION_CALL`
event. They run within a `BottActionContext`.

## 3. Services

Services are the high-level modules that make up the application (e.g., Discord
integration, Storage).

### Key Types

- **[`BottService`](./types.ts)**: A self-contained module with a `name` and
  setup function.
- **[`BottServiceContext`](./types.ts)**: The context provided to a service,
  exposing methods to dispatch events and register listeners.
- **[`BottSystemManager`](./manager.ts)**: The orchestrator that manages the
  lifecycle of services and routes events.

## Architecture

The system follows an event-driven architecture.

1. **Services** connect to external platforms (like Discord) and normalize
   incoming data into `BottEvent`s.
2. **Events** are dispatched to the `SystemManager`.
3. **Listeners** (including other services) react to these events.
4. **Actions** are specialized handlers for specific tasks, invoked via events.

This design allows for easy extension and testing of individual components in
isolation.
