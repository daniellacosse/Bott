# Bott Data Model

This directory defines the ubiquitious language of the Bott ecosystem. It serves
as the contract that all integrations and applications must speak to communicate
with each other.

## Core Structure

The model is split into several domain-specific files:

- **[Entities](./types/entities.ts)**: Represents the "places" and "people" Bott
  interacts with.
- **[Events](./types/events.ts)**: Represents "things that happen" – messages,
  replies, actions.
- **[Actions](./types/actions.ts)**: Defines the capabilities Bott has to affect
  the world.
- **[Reasons](./types/reasons.ts)**: Defines the logic for _why_ Bott decides to
  act (Identity & Rules).
- **[Settings](./types/settings.ts)**: Global configuration that applies across
  each Bott deployment.

## Entities

- **[`BottSpace`](./types/entities.ts)**: A top-level "chat workspace"
  container, analogous to a Discord Guild.
- **[`BottChannel`](./types/entities.ts)**: A communication context within a
  space.
- **[`BottUser`](./types/entities.ts)**: An individual interacting with Bott.

## Events

Events are the primary unit of data flow.

- **[`BottEventType`](./types/events.ts)**:
  - `MESSAGE`: A standard chat message.
  - `REPLY`: A response to another event.
  - `REACTION`: An emoji reaction.
  - `ACTION_CALL`: A request for Bott to perform a tool call (e.g., generate an
    image).
  - `ACTION_RESULT`: The output of a tool call.

All events share a common **[`BottEvent`](./types/events.ts)** interface which
includes:

- `id`, `type`, `createdAt`
- `details`: A generic bag of properties specific to the event type.
- `context`: Links to `user`, `channel`, `parent` event.

## Actions

Actions allow Bott to do more than just speak.

- **[`BottAction`](./types/actions.ts)**: A function signature for a tool the AI
  can invoke.
- **[`BottActionOption`](./types/actions.ts)**: Defines the arguments (string,
  integer, boolean) an action accepts.

## Reasons & Ratings

This is the "brain" of Bott's decision making.

- **[`BottRatingScale`](./types/reasons.ts)**: A 1-5 scale used to evaluate an
  event (e.g., `Urgency`, `Humor`, `Safety`).
- **[`BottReason`](./types/reasons.ts)**: A rule that combines multiple rating
  scales to determine if Bott should take an action (e.g., "Reply if Urgency >
  4").

## Settings

- **[`BottGlobalSettings`](./types/settings.ts)**: Contains Bott's `identity`
  definition and the active set of `reasons` for input and output processing.
