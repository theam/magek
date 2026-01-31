# Change Log - @magek/common

This log was last generated on Sat, 31 Jan 2026 11:54:24 GMT and should not be manually modified.

## 0.0.7
Sat, 31 Jan 2026 11:54:24 GMT

### Minor changes

- Add ReducerAction enum with Skip value for entity reducers and rename ReadModelAction to ProjectionAction
- Migrate to TC39 Stage 3 decorators only. Rename @Field to @field (PascalCase alias kept for compatibility). Remove reflect-metadata import. Remove legacy decorator support.

### Patches

- add evolve helper
- Add sub-millisecond precision to event timestamps for deterministic ordering
- Remove deprecated designType property from FieldMetadata interface

### Updates

- Move createdAt assignment from adapter to framework

## 0.0.6
Tue, 27 Jan 2026 18:50:37 GMT

_Version update only_

## 0.0.5
Sat, 24 Jan 2026 18:28:05 GMT

### Minor changes

- Migrate UUID from v4 to v7, deprecate TimeKey class, update SequenceKey to use UUID

### Updates

- Bump @types/node from 22.19.3 to 22.19.6 to resolve version mismatch

