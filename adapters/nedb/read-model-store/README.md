# NeDB Read Model Store Adapter

This package provides a NeDB-based read model store adapter for the Magek framework.

## Installation

```bash
npm install @magek/adapter-read-model-store-nedb
```

## Usage

```typescript
import { MagekConfig } from '@magek/common'
import { readModelStore } from '@magek/adapter-read-model-store-nedb'

const config = new MagekConfig('development')
config.readModelStoreAdapter = readModelStore
```

## Features

- Full ReadModelStoreAdapter interface implementation
- Support for fetch, search, store, and delete operations
- Built-in health checks
- Comprehensive query capabilities with filtering, sorting, and pagination
- Optimistic concurrency control
- Field projection support

## API

The adapter implements the standard `ReadModelStoreAdapter` interface:

- `fetch(config, readModelName, readModelID)` - Fetch a single read model by ID
- `search(config, readModelName, parameters)` - Search read models with filters
- `store(config, readModelName, readModel)` - Store or update a read model
- `delete(config, readModelName, readModelID)` - Delete a read model by ID
- `rawToEnvelopes(rawReadModels)` - Convert raw data to read model envelopes
- `healthCheck` - Health check methods (isUp, details, urls)

## Storage

Read models are stored in a local NeDB file at `.magek/read_models.json`.