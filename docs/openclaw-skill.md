# OpenClaw Skill: Use `bluesky-user-cli`

Use this CLI to fetch follows, followers, liked posts, and network posts for a Bluesky actor.

## Commands

```bash
bluesky-user-cli follows <actor> [options]
bluesky-user-cli followers <actor> [options]
bluesky-user-cli likes <actor> [options]
bluesky-user-cli posts <actor> [options]
```

## Inputs

- `<actor>` can be:
  - bare username (`cast42`)
  - full handle (`cast42.bsky.social`)
  - DID (`did:plc:...`)
- bare usernames are normalized to `.bsky.social`.
- For `likes`, optional `--since` accepts ISO timestamp, `YYYY-MM-DD`, `today`, `yesterday`.
- For `posts`, provide at least one of:
  - `--since` for posts since a timestamp
  - `--max-posts` for last N posts
- For `posts`, `--from` chooses network source: `follows`, `followers`, or `both`.

## Auth

Use one auth mode:

1. Token mode:

- `--access-token <token>`
- env `BLUESKY_ACCESS_TOKEN`

2. App-password mode:

- `--identifier <handle-or-email>`
- `--app-password <app-password>`
- or env vars `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD`
- The CLI will create a session and auto-resolve the account PDS `serviceEndpoint`.

Do not pass token mode and app-password mode together.

## Output contract

Always parse stdout as JSON envelope:

- `command` is `follows`, `followers`, `likes`, or `posts`
- `target` is original actor input
- `resolvedActor` is normalized actor
- `serviceUrl` is API base URL
- `generatedAt` is ISO timestamp
- `count` is number of records
- `data[]` contains:
  - follows records: `did`, `handle`, `displayName`, `avatar`, `description`
  - followers records: `did`, `handle`, `displayName`, `avatar`, `description`
  - likes records: `uri`, `cid`, `authorDid`, `authorHandle`, `authorDisplayName`, `text`, `createdAt`, `likedAt`
  - posts records: `uri`, `cid`, `authorDid`, `authorHandle`, `authorDisplayName`, `text`, `createdAt`
- `likes` envelopes also include `since` (`ISO string` or `null`).
- `posts` envelopes include `source` and `since` (`ISO string` or `null`).

## Error handling

On stderr, parse JSON:

- `AUTH_ERROR` (exit `2`): missing/invalid token
- `API_ERROR` (exit `3`): Bluesky/network failures
- `VALIDATION_ERROR` (exit `4`): invalid command usage/options

## Examples

```bash
bluesky-user-cli follows cast42
```

```bash
BLUESKY_ACCESS_TOKEN=token bluesky-user-cli follows cast42 --pretty
```

```bash
bluesky-user-cli follows cast42 --identifier cast42.bsky.social --app-password xxxx-xxxx-xxxx-xxxx --pretty
```

```bash
BLUESKY_IDENTIFIER=cast42.bsky.social BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx bluesky-user-cli follows cast42 --pretty
```

```bash
bluesky-user-cli followers cast42 --pretty
```

```bash
bluesky-user-cli likes cast42 --since yesterday --pretty
```

```bash
bluesky-user-cli posts cast42 --from both --since 2025-01-20 --max-posts 100 --pretty
```
