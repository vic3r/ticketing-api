# ticketing-api

## Git hooks (commit & push)

Husky runs checks automatically:

- **On every commit** (pre-commit): `lint-staged` (ESLint --fix + Prettier --write on staged files), then `npm run test`.
- **On every push** (pre-push): `npm run check` (format check + lint + test).

Hooks are installed when you run `npm install` (the `prepare` script runs Husky). If they don’t run (e.g. after a clone or if install didn’t have write access to `.git`), run once:

```bash
npx husky
```

To skip hooks for a single commit or push: `git commit --no-verify` or `git push --no-verify`.
