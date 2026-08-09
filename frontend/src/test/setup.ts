import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// RTL's automatic afterEach-cleanup relies on a global `afterEach`, which
// isn't present since `globals` is off in vitest.config.ts (kept off so
// test files stay explicit about their vitest imports, since tsconfig.app's
// `include: ["src"]` means `tsc -b` — part of `npm run build` — type-checks
// test files too).
afterEach(() => {
  cleanup();
});
