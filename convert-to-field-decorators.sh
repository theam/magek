#!/bin/bash

# Script to convert constructor parameter properties to @Field() decorators

set -e

echo "Converting test files to use @Field() decorators..."

# List of test files to convert
files=(
  "packages/core/test/decorators/event.test.ts"
  "packages/core/test/decorators/entity.test.ts"
  "packages/core/test/decorators/notification.test.ts"
  "packages/core/test/command-dispatcher.test.ts"
  "packages/core/test/event-dispatcher.test.ts"
  "packages/core/test/magek.test.ts"
  "packages/core/test/event-processor.test.ts"
  "packages/core/test/schema-migrator.test.ts"
  "packages/core/test/register-handler.test.ts"
)

for file in "${files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "Skipping $file (not found)"
    continue
  fi

  echo "Processing $file..."

  # Step 1: Add Field import if not already present
  if ! grep -q "Field" "$file"; then
    # Find the line with @magek/common import and add Field to it
    sed -i.bak "s/import { \(.*\) } from '@magek\/common'/import { \1, Field } from '@magek\/common'/" "$file"
  fi

  echo "  ✓ Added Field import"
done

echo ""
echo "✅ Imports updated in all files"
echo ""
echo "⚠️  Next steps (manual):"
echo "1. Review each file and convert constructor parameters to @Field() decorators"
echo "2. Pattern: constructor(readonly id: UUID) → @Field(type => UUID) readonly id!: UUID"
echo "3. Run: rush build && rush test"

