# System: Services

This library provides the infrastructure for defining and managing Bott
Services. Services are the high-level modules that make up the application
(e.g., Discord Service, App Service).

## Key Types

- **[`BottService`](./types.ts)**: A self-contained module with a `name`,
  `settings`, and a setup function.
- **[`BottServicesManager`](./manager.ts)**: The orchestrator that registers,
  configures, and starts all services. It acts as the central event bus, routing
  `BottEvent`s between services.
- **[`BottServiceContext`](./types.ts)**: The execution context provided to a
  service, giving it safe access to:
  - `dispatchEvent`: Send events to the bus.
  - `addEventListener`: Subscribe to specific event types.

## Architecture

Services are designed to be decoupled. They communicate exclusively via
`BottEvent`s, allowing for a flexible and testable architecture.
