# Bott Storage Library

This library handles the persistence of Bott's data, including chat events and
file attachments. It uses SQLite as the underlying database.

## Key Functions

- **[`startStorage(rootPath: string)`](./start.ts)**: Initializes the SQLite
  database connection.

> [!NOTE] Currently, there is no migration system; the schema is initialized on
> startup if it doesn't exist.

- **[`addEvents(event: BottEvent)`](./data/events/add.ts)**: Persists a new
  [`BottEvent`](../../../model/types/events.ts) to the database.
- **`getEvents(...ids: string[])`**: Retrieves events by their IDs.
- **[`prepareAttachmentFrom...`](./prepare/attachment.ts)**: Utilities for
  downloading, processing, and compressing files before storage.

> [!NOTE] Compression is a critical step to ensure that media files (images,
> audio) can fit within the context window limits of the AI models.

## Structure

- **[`data/`](./data/)**: functionality for interacting with the database.
- **[`prepare/`](./prepare/)**: logic for processing input files (downloading,
  compressing).
