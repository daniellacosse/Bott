# @bott/gemini

This library provides the Google Gemini integration layer for Bott. It handles
both conversational event generation (via
[`BottEvent`](../../../model/types/events.ts)s) and specific content creation
tasks.

## Capabilities

### Event Generation

The core "chat" functionality is powered by the Event Pipeline.

- **[Event Pipeline Documentation](./events/README.md)**: Detailed breakdown of
  how input events are processed, generated, and filtered.

### File Generation

Bott uses specialized models for generating specific media types:

- **[Photos](./attachments/photo.ts)**: Generates images using Imagen.
- **[Movies](./attachments/movie.ts)**: Generates video previews using Veo.
- **[Songs](./attachments/song.ts)**: Generates audio tracks using Lyria.
- **[Essays](./attachments/essay.ts)**: Generates long-form text content using
  Gemini Pro.

These are exposed via specific modules in
**[`./attachments/`](./attachments/)**.

> [!NOTE]
> Configuration constants for models and limits are defined in the root
> `constants.ts` file.
