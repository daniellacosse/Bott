# @bott/discord

This library provides the Discord integration layer for Bott. It handles the
connection to the Discord Gateway, normalizes incoming Discord interactions into
[`BottEvent`](../../../../system/events/types.ts)s, and synchronizes slash
commands.

## Key Capabilities

### Service Start (`discordService`)

The library exports a standard `BottService` (`discordService`). When started,
it:

1. **Connects**: Logs into the Discord Gateway using the
   `SERVICE_DISCORD_TOKEN`.
2. **Syncs Commands**: Registers slash commands defined in the `actions`
   configuration with the Discord API.

> [!NOTE]
> History hydration is not currently performed on startup. Bott only sees
> messages that occur while it is running.

### Event Normalization

Incoming Discord `Message`s and `Reaction`s are converted into normalized
[`BottEvent`](../../../../system/events/types.ts) structures. This isolates the
rest of the application (Event Pipeline, Storage) from Discord-specific
implementation details.
