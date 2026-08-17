import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/**
 * S75: first test infrastructure in the project.
 *
 * A standalone Vite config, NOT an extension of next.config.ts -- Next's config is
 * not a Vite config and has no resolve.alias for Vitest to read, so the `@/` mapping
 * has to be restated here. That makes tsconfig.json's `paths` and this file two
 * copies of one fact: if `@/*` ever changes, both move together.
 *
 * The alias is written with fileURLToPath rather than the plain relative string.
 * Vitest resolves a relative alias against the IMPORTING FILE, not the project root,
 * so `"@/": "./src/"` silently resolves to the wrong place from any test that is not
 * at the root -- it is called out as a common error in Vitest's own docs. The
 * documented fix there uses `new URL(...).pathname`, which is not Windows-safe: it
 * yields "/C:/..." with a leading slash. fileURLToPath is the same idea with correct
 * drive-letter handling, which this project needs since it develops on Windows.
 *
 * No `globals: true`. Enabling it would require adding "vitest/globals" to
 * compilerOptions.types in tsconfig.json, and that field is currently ABSENT --
 * meaning TypeScript auto-includes every installed @types package. Introducing the
 * array to add one entry would restrict it to only that entry and drop @types/node,
 * @types/react and the rest. Explicit `import { describe, it, expect } from "vitest"`
 * costs one line per test file and touches no other config.
 *
 * Phase 1 is pure utility functions only, so `environment: "node"` is what these
 * need. A future suite covering React components would want jsdom/happy-dom, which
 * is a per-file `@vitest-environment` docblock rather than a change here.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
