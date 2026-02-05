---
title: "Best Practices"
group: "Architecture"
---

# Best Practices

Quick reference for writing idiomatic Magek code.

## State Updates with `evolve()`

**Always use `evolve()` for entity and read model state updates.**

The `evolve()` helper from `@magek/common`:
- Creates immutable copies (never mutates)
- Handles undefined state (new entities)
- Provides type safety

```typescript
import { evolve } from '@magek/common'
```

### Entity Reducers

```typescript
// DO: Use evolve()
@reduces(ProductCreated)
public static reduceProductCreated(event: ProductCreated, current?: Product): Product {
  return evolve(current, {
    id: event.entityID(),
    name: event.name,
    price: event.price,
  })
}

// DON'T: Manual construction
public static reduceProductCreated(event: ProductCreated): Product {
  return new Product(event.entityID(), event.name, event.price)  // Missing immutability!
}
```

### Read Model Projections

```typescript
// DO: Use evolve()
@projects(Product, 'id')
public static projectProduct(entity: Product, current?: ProductReadModel): ProjectionResult<ProductReadModel> {
  return evolve(current, {
    id: entity.id,
    displayName: entity.name,
  })
}
```

## Common Patterns

### Creating vs Updating Entities

`evolve()` handles both cases automatically:
- When `current` is `undefined` → creates a new entity
- When `current` exists → updates with the provided changes

```typescript
@reduces(ProductCreated)
public static reduceProductCreated(event: ProductCreated, current?: Product): Product {
  // Works for both new entities and updates
  return evolve(current, {
    id: event.entityID(),
    name: event.name,
  })
}
```

### Providing Defaults for New Entities

When creating entities, you can provide default values:

```typescript
return evolve(undefined, { id: event.id, name: event.name }, { status: 'active', createdAt: new Date() })
```

The third parameter provides defaults that are applied when `current` is `undefined`.

### Partial Updates

For update events, only include the fields that change:

```typescript
@reduces(ProductRenamed)
public static reduceProductRenamed(event: ProductRenamed, current?: Product): Product {
  if (!current) return ReducerAction.Skip
  return evolve(current, { name: event.newName })
}
```

## Anti-Patterns

### Mutating State Directly

```typescript
// NEVER do this - breaks immutability
current.balance += amount
return current
```

### Using Spread Operator Instead of evolve()

```typescript
// Avoid - evolve() is clearer and handles edge cases
return { ...current, balance: current.balance + amount }
```

### Constructing Entities Manually

```typescript
// Avoid - doesn't handle undefined current state properly
return new Product(event.id, event.name, event.price)
```

## Utility Helpers Reference

| Helper | Import | Purpose |
|--------|--------|---------|
| `evolve(current, changes)` | `@magek/common` | Immutable state updates |
| `evolve(undefined, changes, defaults)` | `@magek/common` | Create with defaults |
| `UUID.generate()` | `@magek/common` | Generate unique IDs |
| `createInstance(Class, raw)` | `@magek/common` | Instantiate class from raw object |

## Further Reading

- [Entity](./entity.md) - Learn about entity reducers
- [Read Model](./read-model.md) - Learn about projections
- [Event](./event.md) - Learn about events and the `entityID()` method
