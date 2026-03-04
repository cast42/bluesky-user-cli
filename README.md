# @openclaw/bluesky-user-cli

TypeScript CLI for fetching follows, followers, liked posts, and network posts for a Bluesky user.

## Install

```bash
npm install -g @openclaw/bluesky-user-cli
```

## Authentication

Choose one auth mode:

1. Access token mode:

- CLI flag (highest priority): `--access-token`
- Environment variable: `BLUESKY_ACCESS_TOKEN`

2. App password mode:

- `--identifier <handle-or-email>`
- `--app-password <app-password>`
- or env vars: `BLUESKY_IDENTIFIER`, `BLUESKY_APP_PASSWORD`
- CLI creates a session and auto-resolves the correct data service endpoint from the account DID document.

You can place access token in `.env`:

```bash
BLUESKY_ACCESS_TOKEN=your_token_here
```

## Usage

### Help

```bash
bluesky-user-cli --help
bluesky-user-cli follows --help
bluesky-user-cli followers --help
bluesky-user-cli likes --help
bluesky-user-cli posts --help
```

### Fetch follows

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

### Fetch likes

```bash
bluesky-user-cli likes cast42
```

```bash
bluesky-user-cli likes cast42 --since yesterday --pretty
```

```bash
bluesky-user-cli likes cast42 --since 2026-03-03
```

```bash
bluesky-user-cli likes cast42 --since 2026-03-03T12:00:00.000Z
```

### Fetch followers

```bash
bluesky-user-cli followers cast42
```

```bash
BLUESKY_ACCESS_TOKEN=token bluesky-user-cli followers cast42 --pretty
```

### Fetch posts from follows/followers

```bash
bluesky-user-cli posts cast42 --from follows --since yesterday --pretty
```

```bash
bluesky-user-cli posts cast42 --from followers --max-posts 50 --pretty
```

```bash
bluesky-user-cli posts cast42 --from both --since 2025-01-20 --max-posts 100 --pretty
```

### Actor normalization

- `cast42` -> `cast42.bsky.social`
- `cast42.bsky.social` -> unchanged
- `did:plc:...` -> unchanged

## CLI contract

Commands:

- `bluesky-user-cli follows <actor> [options]`
- `bluesky-user-cli followers <actor> [options]`
- `bluesky-user-cli likes <actor> [options]`
- `bluesky-user-cli posts <actor> [options]`

Options:

- `--access-token <token>`
- `--identifier <identifier>` (handle/email, used with `--app-password`)
- `--app-password <password>` (used with `--identifier`)
- `BLUESKY_IDENTIFIER` + `BLUESKY_APP_PASSWORD` (env alternative to `--identifier` + `--app-password`)
- `--service-url <url>` (default: `https://bsky.social`; auth endpoint, auto-resolved data endpoint in app-password mode)
- `--page-size <n>` (default: `100`, max `100`)
- `--max-items <n>` (optional cap)
- `--since <value>` (likes command only: accepts ISO timestamp, `YYYY-MM-DD`, `today`, `yesterday`)
- `--from <source>` (posts command only: `follows`, `followers`, or `both`)
- `--max-posts <n>` (posts command only: return latest `n` posts after aggregation/sorting)
- `--pretty`
- `-h, --help`
- `-V, --version`

## Output

Default output is JSON envelope:

```json
{
  "command": "follows",
  "target": "cast42",
  "resolvedActor": "cast42.bsky.social",
  "serviceUrl": "https://bsky.social",
  "generatedAt": "2026-03-04T10:00:00.000Z",
  "count": 1,
  "data": [
    {
      "did": "did:plc:...",
      "handle": "user.bsky.social",
      "displayName": "User",
      "avatar": null,
      "description": null
    }
  ]
}
```

Likes output:

```json
{
  "command": "likes",
  "target": "cast42",
  "resolvedActor": "cast42.bsky.social",
  "serviceUrl": "https://bsky.social",
  "generatedAt": "2026-03-04T10:00:00.000Z",
  "since": "2026-03-03T00:00:00.000Z",
  "count": 1,
  "data": [
    {
      "uri": "at://did:plc:author/app.bsky.feed.post/abc123",
      "cid": "bafycid",
      "authorDid": "did:plc:author",
      "authorHandle": "author.bsky.social",
      "authorDisplayName": "Author",
      "text": "Hello world",
      "createdAt": "2026-03-03T12:00:00.000Z",
      "likedAt": "2026-03-04T08:00:00.000Z"
    }
  ]
}
```

Posts output:

```json
{
  "command": "posts",
  "target": "cast42",
  "resolvedActor": "cast42.bsky.social",
  "source": "follows",
  "serviceUrl": "https://bsky.social",
  "generatedAt": "2026-03-04T10:00:00.000Z",
  "since": "2026-03-03T00:00:00.000Z",
  "count": 2,
  "data": [
    {
      "uri": "at://did:plc:author/app.bsky.feed.post/abc123",
      "cid": "bafycid",
      "authorDid": "did:plc:author",
      "authorHandle": "author.bsky.social",
      "authorDisplayName": "Author",
      "text": "Hello world",
      "createdAt": "2026-03-03T12:00:00.000Z"
    }
  ]
}
```

## Errors and exit codes

Errors are always structured JSON on stderr:

```json
{
  "error": {
    "code": "AUTH_ERROR|API_ERROR|VALIDATION_ERROR",
    "message": "...",
    "details": {}
  }
}
```

Exit codes:

- `0` success
- `2` auth/config error
- `3` Bluesky API/network error
- `4` invalid args/input

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## OpenClaw

See [docs/openclaw-skill.md](docs/openclaw-skill.md) for a ready-to-use skill prompt.
