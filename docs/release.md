# Release

## Checklist

- Update `package.json` to the release version.
- Update `content/changelog/en.json` with user-facing release notes.
- Run `pnpm lint` when practical.
- Run `pnpm test`.
- Run `pnpm typecheck`.
- Commit the release changes.
- Tag the release commit.
- Push the commit.
- Push the tag.

## Tagging

- Use a version tag such as `v0.1.0`.
- Create the tag on the exact release commit.
- Push `main`.
- Push the version tag.
- Ensure every public release tag points to the exact commit deployed from `main`.

## Commands

- `git tag v0.1.0`
- `git push origin main`
- `git push origin v0.1.0`
