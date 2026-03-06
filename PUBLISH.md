# Publishing `@cast42/bluesky-user-cli`

This package is published to npm as `@cast42/bluesky-user-cli`.

## Reminder: bump the version first

Do this before every publish. npm will reject a publish if the exact version already exists.

Choose one:

- Patch release for fixes: `npm version patch`
- Minor release for backwards-compatible features: `npm version minor`
- Major release for breaking changes: `npm version major`

What this does:

- Updates the version in `package.json`
- Updates `package-lock.json`
- Creates a git commit and tag if the git working tree is clean

If you only want to update the version files without creating a git commit/tag:

```bash
npm version patch --no-git-tag-version
```

Replace `patch` with `minor` or `major` as needed.

## Publish steps

1. Log in to npm if needed:

```bash
npm login
npm whoami
```

2. Bump the version:

```bash
npm version patch
```

3. Run the checks:

```bash
npm test
npm run build
```

4. Preview the package contents:

```bash
npm pack --dry-run
```

5. Publish the package:

```bash
npm publish --access public
```

`--access public` is required because this is a scoped package.

## Quick release flow

```bash
npm version patch
npm test
npm run build
npm pack --dry-run
npm publish --access public
```

## Troubleshooting

If npm fails because of a local cache permissions issue, use a temporary cache:

```bash
NPM_CONFIG_CACHE=/tmp/bluesky-user-cli-npm-cache npm pack --dry-run
NPM_CONFIG_CACHE=/tmp/bluesky-user-cli-npm-cache npm publish --access public
```
