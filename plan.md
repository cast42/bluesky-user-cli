# Plan: `@openclaw/bluesky-user-cli` (TypeScript npm CLI)

## Summary

Build a CLI-first TypeScript package published to npm as `@openclaw/bluesky-user-cli` with binary `bluesky-user-cli`.  
The CLI will provide:

1. `followers <actor>`: full current followers list.
2. `follows <actor>`: full current follows list.
3. `likes <actor> --since <date|datetime>`: liked posts since a local-timezone inclusive timestamp.  

It will be agent-friendly by default (`JSON` output envelope), include extensive `--help` with examples, support token via `--access-token` or `.env` (`BLUESKY_ACCESS_TOKEN`), and include a ready OpenClaw skill prompt file.

## Public Interfaces (Decision-Complete)

### Package/Binary

- npm package: `@openclaw/bluesky-user-cli`
- bin command: `bluesky-user-cli`
- Node runtime target: `>=20`

### CLI surface

- `bluesky-user-cli followers <actor> [options]`
- `bluesky-user-cli follows <actor> [options]`
- `bluesky-user-cli likes <actor> --since <value> [options]`

### Global options

- `--access-token <token>`: overrides env token.
- `--service-url <url>`: default `https://bsky.social`.
- `--pretty`: pretty-print JSON (default compact JSON).
- `-h, --help`
- `-V, --version`

### Command options

- `followers`:
  - `--page-size <n>` default `100` (bounded to API max).
  - `--max-items <n>` optional safety cap; otherwise fetch all.
- `follows`:
  - `--page-size <n>` default `100`.
  - `--max-items <n>` optional safety cap; otherwise fetch all.
- `likes`:
  - `--since <value>` required; accepts ISO datetime or `YYYY-MM-DD`.
  - `--page-size <n>` default `100`.
  - `--max-items <n>` optional cap; otherwise fetch all matching window.

### Output contract (default)

Each command emits an envelope object:

```json
{
  "command": "followers|follows|likes",
  "target": "handle or did input",
  "serviceUrl": "https://bsky.social",
  "since": "ISO UTC string or null",
  "generatedAt": "ISO UTC string",
  "count": 0,
  "data": []
}
```

Record schemas:

- Followers/Follows records (normalized):
  - `did`, `handle`, `displayName`, `avatar`, `description`
- Likes records (normalized):
  - `likeIndexedAt`, `postUri`, `postCid`, `postAuthorDid`, `postAuthorHandle`, `postCreatedAt`, `postIndexedAt`, `text`

### Date semantics

- `likes --since` uses **local timezone inclusive** semantics.
- `YYYY-MM-DD` means local `00:00:00`.
- Datetime without offset is interpreted in local timezone.
- Converted internally to UTC for comparisons.
- Comparison rule: include records where `likeIndexedAt >= since`.

### Authentication

- Token source precedence: `--access-token` > `BLUESKY_ACCESS_TOKEN`.
- No login flow in v1 (access-token-only model).
- If token missing/invalid/expired: command fails with auth error and non-zero exit code.

## Implementation Design

### Repo scaffold

- `package.json`, `tsconfig.json`, `.gitignore`, `.npmignore`
- `src/cli.ts` (entrypoint)
- `src/commands/followers.ts`
- `src/commands/follows.ts`
- `src/commands/likes.ts`
- `src/lib/bluesky.ts` (XRPC client + pagination)
- `src/lib/auth.ts` (token resolution + validation)
- `src/lib/datetime.ts` (local parse + UTC normalize)
- `src/lib/output.ts` (envelope serialization)
- `src/types/output.ts`
- `tests/*`
- `README.md`
- `docs/openclaw-skill.md`

### Libraries

- Runtime: `commander`, `dotenv`, `zod` (input validation)
- Dev: `typescript`, `tsx`, `vitest`, `@types/node`, `eslint`, `prettier` (or project formatter preference)

### Bluesky API usage

- Use XRPC endpoints with bearer token:
  - `app.bsky.graph.getFollowers`
  - `app.bsky.graph.getFollows`
  - `app.bsky.feed.getActorLikes`
- Implement cursor-based pagination loop.
- Followers/follows: return full snapshot (no since filter).
- Likes: filter by `reason.indexedAt` (fallback to best available timestamp if missing), stop early when page ordering passes `since`.

### Help/UX requirements

- Root `--help` includes:
  - short purpose
  - auth setup (`.env` and flag examples)
  - command list
  - copy-paste examples for OpenClaw usage
- Each subcommand `--help` includes:
  - what it fetches
  - required/optional flags
  - JSON output example
  - exit code behavior

### Error model

- Exit `0` success.
- Exit `2` auth/config errors.
- Exit `3` Bluesky API/network errors.
- Exit `4` invalid arguments/date parsing.
- Error output is JSON:

```json
{"error":{"code":"AUTH_ERROR","message":"...","details":{}}}
```

- Never print token values in logs/errors.

## Testing and Acceptance Criteria

### Unit tests

- Token resolution precedence (`flag > env`).
- Date parsing local-timezone behavior.
- Since inclusive boundary logic.
- Output schema validation for each command.
- Argument validation and error code mapping.

### Integration tests (mocked HTTP)

- Pagination across multiple cursor pages.
- Followers/follows fetch-all behavior.
- Likes filtering and early-stop behavior.
- Auth failures and upstream error propagation.

### CLI snapshot tests

- Root help text snapshot.
- Subcommand help snapshots.
- Version and invalid command output.

### Acceptance scenarios

1. `followers` with valid token returns envelope + non-empty `data`.
2. `follows` paginates all pages automatically.
3. `likes --since 2026-03-03` returns only likes on/after local midnight.
4. Missing token returns exit `2` with structured JSON error.
5. `--help` alone is sufficient for an agent to discover usage and examples.

## CI, Release, and Publish

- GitHub Actions:
  - install, typecheck, test, build on PR/push.
- Build artifact:
  - transpile TS to `dist/`.
  - bin points to built CLI entry.
- npm publish:
  - package includes only runtime files (`dist`, `README`, `LICENSE`).
  - first release `0.1.0`, then semver.
- Add README section: “Use with OpenClaw”.
- Include `docs/openclaw-skill.md` as a ready prompt template.

## Assumptions and Defaults

- `.evn` in prompt interpreted as `.env`.
- Default Bluesky service URL is `https://bsky.social`.
- Access token lifecycle (refresh/rotation) is handled outside this CLI.
- `--since` applies only to `likes` (explicitly chosen).
- Output default is JSON envelope (compact), with optional `--pretty`.
- No separate JS SDK API in v1; CLI contract is the public interface.
