# @bott/discord

This library provides the Discord integration layer for Bott. It handles the
connection to the Discord Gateway, normalizes incoming Discord interactions into
[`BottEvent`](../../model/types/events.ts)s, and synchronizes slash commands.

## Key Capabilities

### bot start (`startDiscordBot`)

The primary entry point is `startDiscordBot`. It:

1. **Connects**: Logs into the Discord Gateway using the `DISCORD_TOKEN`.
2. **Hydrates History**: Fetches recent messages from accessible channels to
   prime Bott's memory (Context).
3. **Syncs Commands**: Registers slash commands defined in the `actions`
   configuration with the Discord API.

### Event Normalization

Incoming Discord `Message`s and `Reaction`s are converted into normalized
[`BottEvent`](../../model/types/events.ts) structures. This isolates the rest of
the application (Event Pipeline, Storage) from Discord-specific implementation
details.
