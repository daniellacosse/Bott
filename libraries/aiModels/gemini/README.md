# @bott/gemini

This library provides the Google Gemini integration layer for Bott. It handles
both conversational event generation (via
[`BottEvent`](../../system/events/types.ts)s) and specific content creation
tasks.

## Capabilities

### Event Generation

The core "chat" functionality is powered by the Event Pipeline.

- **[Response Pipeline Documentation](./actions/response/README.md)**: Detailed
  breakdown of how input events are processed, generated, and filtered.

### Actions

- **[Photos](./actions/photo.ts)**: Sends a generated image.
- **[Movies](./actions/movie.ts)**: Sends a generated video.
- **[Songs](./actions/song.ts)**: Sends a generated song.

> [!NOTE]
> Configuration constants for models and limits are defined in the root
> `constants.ts` file.
