# Release checklist

1. Update `package.json` to the release version.
2. Update `content/changelog/en.json` with user-facing release notes.
3. Run `pnpm lint`, `pnpm test`, and `pnpm typecheck`.
4. Commit the release changes.
5. Tag the release commit:

   ```bash
   git tag v0.1.0
   ```

6. Push the commit and tag:

   ```bash
   git push origin main
   git push origin v0.1.0
   ```

Every public release tag should point to the exact commit deployed from `main`.
