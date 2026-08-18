# @magek/jeparag

> Native **Joint Embedding Predictive Architecture (JEPA)** + **Okapi BM25** Hybrid Retrieval Engine for Magek Ambient Agents.

---

## 🧠 Overview

`@magek/jeparag` brings advanced hybrid RAG capabilities natively into the **Magek** event-driven framework. It combines dense vector semantic representations (JEPA) with sparse keyword matching (Okapi BM25) using **Reciprocal Rank Fusion (RRF)**.

Designed for high-precision, zero-recall-loss applications such as legal auditing, compliance monitoring, and technical log diagnostics.

---

## ⚡ Key Features

- **DocumentLoader & Sliding Window Chunker**: Preserves semantic continuity with configurable chunk sizes (e.g., 256 words, 50 overlap).
- **JEPA Embedder**: Multi-provider embedding engine (Google Gemini, OpenAI, Hash local fallback).
- **BM25 Sparse Keyword Index**: Native Okapi BM25 implementation in TypeScript.
- **Reciprocal Rank Fusion (RRF)**: Merges dense vector cosine similarity ranks with BM25 ranks ($k=60$).
- **Magek Event Sourcing Integration**: Emits immutable events (`DocumentIngestedEvent`, `ChunkEmbeddedEvent`, `JeparagQueryProcessedEvent`).
- **JeparagAmbientAgent**: Proactive background worker reacting to event streams and executing contextual RAG generation.

---

## 🚀 Usage Example

```typescript
import {
  DocumentIngestedEvent,
  JeparagAmbientAgent,
  JeparagHybridSearchReadModel
} from '@magek/jeparag'

// 1. Instantiate Magek Ambient Agent
const agent = new JeparagAmbientAgent('hash')

// 2. Ingest document event
const ingestEvent = new DocumentIngestedEvent(
  'doc-101',
  'HIPAA Compliance Policy',
  'Section 1: Sign-in sheets that reveal patient names are prohibited...'
)

// 3. Process ingestion and populate ReadModel
await agent.onDocumentIngested(ingestEvent)

// 4. Execute hybrid query
const queryResult = await agent.processQuery('query-1', 'sign-in sheet violations', 5)

console.log(queryResult.answer)
```

---

## 🧪 Testing

Run unit tests:

```bash
cd packages/jeparag
rushx test
```

---

## 📜 License

Licensed under Apache-2.0.
