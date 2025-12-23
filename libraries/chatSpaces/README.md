# Chat Spaces

Chat spaces are integrations that connect Bott to external chat platforms like
Discord, Slack, or other messaging services.

## Requirements

All chat space integrations must adhere to the following standards to ensure
proper operation with the Bott system.

### User Mention Format

When converting messages from external platforms to Bott events, user mentions
must be formatted as:

```
@<personaId>
```

Where `personaId` is the unique identifier for the user's persona in the
specific space.

#### Examples

- Discord mention `<@123456789>` should become `@<123456789>` in the BottEvent
  content
- Slack mention `<@U12345678>` should become `@<U12345678>` in the BottEvent
  content

#### Persona Management

Chat space integrations should:

1. Create or update personas for users when they interact in a space
2. Store the persona with:
   - `id`: The platform-specific user ID
   - `handle`: The user's handle/username (e.g., "john_doe"). Must be unique per
     space. Should contain only alphanumeric characters, underscores, and
     hyphens. Platform-specific validations may apply stricter rules (e.g., no
     leading/trailing hyphens).
   - `displayName`: The user's display name if different from handle (e.g.,
     "John Doe")
   - `space`: The space the persona belongs to
   - `user`: Optional reference to the canonical Bott user if known

#### How It Works

The system automatically transforms mentions:

1. **Incoming (Platform → LLM)**: `@<personaId>` → `@handle`
   - Makes mentions more readable for the LLM
   - Example: `@<123456789>` becomes `@john_doe`

2. **Outgoing (LLM → Platform)**: `@handle` → `@<personaId>`
   - Converts LLM output back to platform format
   - Example: `@john_doe` becomes `@<123456789>`

This transformation happens automatically in the pipeline, so chat spaces only
need to ensure incoming mentions use the `@<personaId>` format and personas are
properly stored.

## Integration Checklist

When creating a new chat space integration:

- [ ] Convert platform mentions to `@<personaId>` format
- [ ] Create/update personas using `upsertPersona()` for all users
- [ ] Include `handle` and optionally `displayName` in personas
- [ ] Ensure personas are associated with the correct space
- [ ] Handle outgoing mentions in platform-specific format (the system provides
      `@<personaId>`)
