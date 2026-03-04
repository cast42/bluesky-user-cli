import { z } from 'zod';

import { CliError } from '../errors';
import { FollowRecord, LikeRecord } from '../types/output';

const MAX_PAGE_SIZE = 100;

const actorProfileSchema = z.object({
  did: z.string(),
  handle: z.string(),
  displayName: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  description: z.string().optional().nullable()
});

const followsResponseSchema = z.object({
  cursor: z.string().optional(),
  follows: z.array(actorProfileSchema)
});

const followersResponseSchema = z.object({
  cursor: z.string().optional(),
  followers: z.array(actorProfileSchema)
});

const actorLikeFeedItemSchema = z.object({
  post: z.object({
    uri: z.string(),
    cid: z.string(),
    author: z.object({
      did: z.string(),
      handle: z.string(),
      displayName: z.string().optional().nullable()
    }),
    indexedAt: z.string().optional().nullable(),
    record: z.record(z.unknown()).optional()
  }),
  reason: z.record(z.unknown()).optional().nullable()
});

const likesResponseSchema = z.object({
  cursor: z.string().optional(),
  feed: z.array(actorLikeFeedItemSchema)
});

interface FetchFollowsParams {
  actor: string;
  accessToken: string;
  serviceUrl: string;
  pageSize: number;
  maxItems?: number;
  fetchImpl: typeof fetch;
}

interface FetchFollowersParams {
  actor: string;
  accessToken: string;
  serviceUrl: string;
  pageSize: number;
  maxItems?: number;
  fetchImpl: typeof fetch;
}

interface FetchLikesParams {
  actor: string;
  accessToken: string;
  serviceUrl: string;
  pageSize: number;
  maxItems?: number;
  since?: Date;
  fetchImpl: typeof fetch;
}

interface FollowsPage {
  cursor?: string;
  follows: FollowRecord[];
}

interface FollowersPage {
  cursor?: string;
  followers: FollowRecord[];
}

interface LikesPage {
  cursor?: string;
  likes: LikeRecord[];
}

function toFollowRecord(
  profile: z.infer<typeof actorProfileSchema>
): FollowRecord {
  return {
    did: profile.did,
    handle: profile.handle,
    displayName: profile.displayName ?? null,
    avatar: profile.avatar ?? null,
    description: profile.description ?? null
  };
}

function readRecordString(
  record: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function toLikeRecord(
  feedItem: z.infer<typeof actorLikeFeedItemSchema>
): LikeRecord {
  const likedAtValue = feedItem.reason?.indexedAt;
  const likedAt = typeof likedAtValue === 'string' ? likedAtValue : null;
  const createdAt =
    readRecordString(feedItem.post.record, 'createdAt') ??
    feedItem.post.indexedAt ??
    null;

  return {
    uri: feedItem.post.uri,
    cid: feedItem.post.cid,
    authorDid: feedItem.post.author.did,
    authorHandle: feedItem.post.author.handle,
    authorDisplayName: feedItem.post.author.displayName ?? null,
    text: readRecordString(feedItem.post.record, 'text'),
    createdAt,
    likedAt
  };
}

async function fetchFollowsPage(
  params: Omit<FetchFollowsParams, 'pageSize' | 'maxItems'> & {
    cursor?: string;
    limit: number;
  }
): Promise<FollowsPage> {
  const url = new URL('/xrpc/app.bsky.graph.getFollows', params.serviceUrl);
  url.searchParams.set('actor', params.actor);
  url.searchParams.set('limit', String(params.limit));

  if (params.cursor) {
    url.searchParams.set('cursor', params.cursor);
  }

  let response: Response;

  try {
    response = await params.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new CliError('API_ERROR', 'Failed to reach Bluesky API.', 3, {
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  let body: unknown = undefined;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CliError(
        'AUTH_ERROR',
        'Access token rejected by Bluesky API.',
        2,
        {
          status: response.status,
          body
        }
      );
    }

    throw new CliError(
      'API_ERROR',
      `Bluesky API request failed (${response.status}).`,
      3,
      {
        status: response.status,
        body
      }
    );
  }

  const parsed = followsResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new CliError(
      'API_ERROR',
      'Bluesky API response had an unexpected shape.',
      3,
      {
        issues: parsed.error.issues
      }
    );
  }

  return {
    cursor: parsed.data.cursor,
    follows: parsed.data.follows.map(toFollowRecord)
  };
}

async function fetchLikesPage(
  params: Omit<FetchLikesParams, 'pageSize' | 'maxItems' | 'since'> & {
    cursor?: string;
    limit: number;
  }
): Promise<LikesPage> {
  const url = new URL('/xrpc/app.bsky.feed.getActorLikes', params.serviceUrl);
  url.searchParams.set('actor', params.actor);
  url.searchParams.set('limit', String(params.limit));

  if (params.cursor) {
    url.searchParams.set('cursor', params.cursor);
  }

  let response: Response;

  try {
    response = await params.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new CliError('API_ERROR', 'Failed to reach Bluesky API.', 3, {
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  let body: unknown = undefined;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CliError(
        'AUTH_ERROR',
        'Access token rejected by Bluesky API.',
        2,
        {
          status: response.status,
          body
        }
      );
    }

    throw new CliError(
      'API_ERROR',
      `Bluesky API request failed (${response.status}).`,
      3,
      {
        status: response.status,
        body
      }
    );
  }

  const parsed = likesResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new CliError(
      'API_ERROR',
      'Bluesky API response had an unexpected shape.',
      3,
      {
        issues: parsed.error.issues
      }
    );
  }

  return {
    cursor: parsed.data.cursor,
    likes: parsed.data.feed.map(toLikeRecord)
  };
}

async function fetchFollowersPage(
  params: Omit<FetchFollowersParams, 'pageSize' | 'maxItems'> & {
    cursor?: string;
    limit: number;
  }
): Promise<FollowersPage> {
  const url = new URL('/xrpc/app.bsky.graph.getFollowers', params.serviceUrl);
  url.searchParams.set('actor', params.actor);
  url.searchParams.set('limit', String(params.limit));

  if (params.cursor) {
    url.searchParams.set('cursor', params.cursor);
  }

  let response: Response;

  try {
    response = await params.fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new CliError('API_ERROR', 'Failed to reach Bluesky API.', 3, {
      cause: error instanceof Error ? error.message : String(error)
    });
  }

  let body: unknown = undefined;

  try {
    body = await response.json();
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CliError(
        'AUTH_ERROR',
        'Access token rejected by Bluesky API.',
        2,
        {
          status: response.status,
          body
        }
      );
    }

    throw new CliError(
      'API_ERROR',
      `Bluesky API request failed (${response.status}).`,
      3,
      {
        status: response.status,
        body
      }
    );
  }

  const parsed = followersResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new CliError(
      'API_ERROR',
      'Bluesky API response had an unexpected shape.',
      3,
      {
        issues: parsed.error.issues
      }
    );
  }

  return {
    cursor: parsed.data.cursor,
    followers: parsed.data.followers.map(toFollowRecord)
  };
}

function parseTimestampMs(timestamp: string | null): number | null {
  if (!timestamp) {
    return null;
  }

  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? null : value;
}

function getLikeTimeMsForSinceFilter(like: LikeRecord): number | null {
  return parseTimestampMs(like.likedAt) ?? parseTimestampMs(like.createdAt);
}

export async function fetchAllFollows(
  params: FetchFollowsParams
): Promise<FollowRecord[]> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE);
  const follows: FollowRecord[] = [];
  let cursor: string | undefined = undefined;

  do {
    if (params.maxItems && follows.length >= params.maxItems) {
      break;
    }

    const remaining = params.maxItems
      ? params.maxItems - follows.length
      : pageSize;
    const limit = Math.min(pageSize, Math.max(remaining, 1));

    const page = await fetchFollowsPage({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      fetchImpl: params.fetchImpl,
      cursor,
      limit
    });

    follows.push(...page.follows);
    cursor = page.cursor;

    if (page.follows.length === 0) {
      break;
    }
  } while (cursor);

  if (params.maxItems) {
    return follows.slice(0, params.maxItems);
  }

  return follows;
}

export async function fetchAllFollowers(
  params: FetchFollowersParams
): Promise<FollowRecord[]> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE);
  const followers: FollowRecord[] = [];
  let cursor: string | undefined = undefined;

  do {
    if (params.maxItems && followers.length >= params.maxItems) {
      break;
    }

    const remaining = params.maxItems
      ? params.maxItems - followers.length
      : pageSize;
    const limit = Math.min(pageSize, Math.max(remaining, 1));

    const page = await fetchFollowersPage({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      fetchImpl: params.fetchImpl,
      cursor,
      limit
    });

    followers.push(...page.followers);
    cursor = page.cursor;

    if (page.followers.length === 0) {
      break;
    }
  } while (cursor);

  if (params.maxItems) {
    return followers.slice(0, params.maxItems);
  }

  return followers;
}

export async function fetchAllLikes(
  params: FetchLikesParams
): Promise<LikeRecord[]> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE);
  const likes: LikeRecord[] = [];
  let cursor: string | undefined = undefined;
  let stopForSince = false;
  const sinceMs = params.since?.getTime();

  do {
    if (params.maxItems && likes.length >= params.maxItems) {
      break;
    }

    const remaining = params.maxItems ? params.maxItems - likes.length : pageSize;
    const limit = Math.min(pageSize, Math.max(remaining, 1));

    const page = await fetchLikesPage({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      fetchImpl: params.fetchImpl,
      cursor,
      limit
    });

    for (const like of page.likes) {
      if (sinceMs !== undefined) {
        const likeTimeMs = getLikeTimeMsForSinceFilter(like);

        if (likeTimeMs === null) {
          continue;
        }

        if (likeTimeMs < sinceMs) {
          // Likes are returned newest-first; once we cross the boundary we can stop paging.
          stopForSince = true;
          continue;
        }
      }

      likes.push(like);

      if (params.maxItems && likes.length >= params.maxItems) {
        break;
      }
    }

    cursor = page.cursor;

    if (page.likes.length === 0 || stopForSince) {
      break;
    }
  } while (cursor);

  if (params.maxItems) {
    return likes.slice(0, params.maxItems);
  }

  return likes;
}
