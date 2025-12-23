# Bott Data Model

This directory defines the ubiquitious language of the Bott ecosystem. It serves
as the contract that all integrations and applications must speak to communicate
with each other.

## Core Structure

The model is split into several domain-specific files:

- **[Entities](../libraries/system/events/README.md)**: Represents the "places"
  and "people" Bott interacts with.
- **[Reasons](../app/settings/reasons.ts)**: Defines the logic for _why_ Bott
  decides to act (Identity & Rules).
- **[Settings](../libraries/system/services/README.md)**: Global configuration
  that applies across each Bott deployment.

## Entities

- **[`BottSpace`](../libraries/system/events/README.md)**: A top-level "chat
  workspace" container, analogous to a Discord Guild.
- **[`BottChannel`](../libraries/system/events/README.md)**: A communication
  context within a space.
- **[`BottUser`](../libraries/system/events/README.md)**: An individual
  interacting with Bott.

## Reasons & Ratings

This is the "brain" of Bott's decision making.

- **[`BottRatingScale`](../app/settings/ratingScales.ts)**: A 1-5 scale used to
  evaluate an event (e.g., `Urgency`, `Humor`, `Safety`).
- **[`BottReason`](../app/settings/reasons.ts)**: A rule that combines multiple
  rating scales to determine if Bott should act (e.g., "Reply if Urgency > 4").

## Settings

- **[`BottGlobalSettings`](../libraries/system/services/README.md)**: Contains
  Bott's `identity` definition and the active set of `reasons` for input and
  output processing.
