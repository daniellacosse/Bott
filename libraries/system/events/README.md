# System: Events

This library defines the fundamental data structures for the Bott ecosystem.
Events are the atomic units of information flow.

## Key Types

- **[`BottEvent<T>`](./types.ts)**: The universal envelope for all occurrences.
  - `id`: Unique UUID.
  - `type`: [`BottEventType`](./types.ts) discriminator (e.g., `MESSAGE`,
    `ACTION_CALL`).
  - `detail`: The payload specific to the event type.
  - `context`: Metadata linking the event to a `user`, `channel`, and `parent`
    event.

- **[`BottEventType`](./types.ts)**: Enumeration of all known event types.
- **[`BottEventAttachment`](./types.ts)**: Represents media or files attached to
  an event. Handles both raw and compressed versions.

## Philosophy

Bott is an event-driven system. Everything from a user sending a message to the
AI generating a thought is modeled as a `BottEvent`. This uniform structure
simplifies storage, logging, and inter-service communication.
