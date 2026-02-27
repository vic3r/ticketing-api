# Contributing

## Branching and pull requests

- **Base branch:** `main`. Do all development in a branch and open pull requests **against `main`**.
- **Draft PRs:** Open a **draft** pull request as soon as you start work. This gives visibility, allows early review, and ensures CI runs. When the work is ready for merge, mark the PR **Ready for review**.
- **CI must pass:** Lint, format check, tests, and build must succeed before a PR can be merged. Branch protection can enforce this.

## PR standards

1. **Title**
    - Short, descriptive (e.g. `Add rate limit for auth routes`, `Fix Kafka consumer onReady timeout`).
    - Optionally prefix with area: `api:`, `deps:`, `docs:`, `ci:`.

2. **Description**
    - Use the PR template that pre-populates when you open a new PR (`.github/PULL_REQUEST_TEMPLATE.md`). Fill in the summary, link any issue with "Fixes #123", and tick the checklist.
    - Summarise what changed and why.
    - If it fixes an issue, include “Fixes #123” (or “Closes #123”) so the issue is linked and auto-closed.
    - Note any breaking changes or follow-ups.

3. **Scope**
    - One logical change per PR when possible. Split large work into smaller PRs.

4. **Review**
    - Mark the PR **Ready for review** only when it’s complete and you’ve addressed your own review (self-review).
    - Respond to review comments and re-request review after updates if your team expects it.

5. **Merge**
    - Prefer **squash and merge** or **rebase and merge** so `main` stays linear, unless the repo standard is merge commits.

## Local checks before pushing

Run the same steps CI runs:

```bash
npm run format:check && npm run lint && npm run test && npm run build
```

Or use the single command:

```bash
npm run check && npm run build
```

Pre-push hooks (Husky) run `npm run check` automatically if installed.
