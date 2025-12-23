# Bott Storage Library

This library handles the persistence of Bott's data, including chat events and
file attachments. It uses SQLite as the underlying database.

## Key Functions

- **[`eventStorageService`](./database/events/service.ts)**: A Bott Service that
  automatically manages the connection and listeners for persistence.

> [!NOTE] Currently, there is no migration system; the schema is initialized on
> startup if it doesn't exist.

- **[`upsertEvents(event: BottEvent)`](./database/events/upsert.ts)**: Persists
  or updates a [`BottEvent`](../events/README.md) in the database.
- **[`getEvents(...ids: string[])`](./database/events/get.ts)**: Retrieves
  events by their IDs.
- **[`prepareAttachmentFrom...`](./attachment/prepare.ts)**: Utilities for
  downloading, processing, and compressing files before storage.

> [!NOTE] Compression is a critical step to ensure that media files (images,
> audio) can fit within the context window limits of the AI models.

## Structure

- **[`database/`](./database/)**: functionality for interacting with the
  database.
- **[`attachment/`](./attachment/)**: logic for processing input files
  (downloading, compressing).
