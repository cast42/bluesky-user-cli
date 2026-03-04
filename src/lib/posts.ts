import { z } from 'zod';

import { CliError } from '../errors';
import { fetchAllFollowers, fetchAllFollows } from './bluesky';
import { FollowRecord, PostRecord } from '../types/output';

const MAX_PAGE_SIZE = 100;

const authorFeedItemSchema = z.object({
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
  })
});

const authorFeedResponseSchema = z.object({
  cursor: z.string().optional(),
  feed: z.array(authorFeedItemSchema)
});

export type NetworkSource = 'follows' | 'followers' | 'both';

interface FetchPostsFromNetworkParams {
  actor: string;
  source: NetworkSource;
  accessToken: string;
  serviceUrl: string;
  pageSize: number;
  maxPosts?: number;
  since?: Date;
  fetchImpl: typeof fetch;
}

interface FetchAuthorPostsParams {
  authorDid: string;
  accessToken: string;
  serviceUrl: string;
  pageSize: number;
  maxItems?: number;
  since?: Date;
  fetchImpl: typeof fetch;
}

interface AuthorFeedPage {
  cursor?: string;
  feed: Array<z.infer<typeof authorFeedItemSchema>>;
}

function readRecordString(
  record: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = record?.[key];
  return typeof value === 'string' ? value : null;
}

function toPostRecord(feedItem: z.infer<typeof authorFeedItemSchema>): PostRecord {
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
    createdAt
  };
}

function parseTimestampMs(timestamp: string | null): number | null {
  if (!timestamp) {
    return null;
  }

  const value = Date.parse(timestamp);
  return Number.isNaN(value) ? null : value;
}

function sortPostsNewestFirst(posts: PostRecord[]): PostRecord[] {
  return [...posts].sort((left, right) => {
    const rightTime = parseTimestampMs(right.createdAt) ?? 0;
    const leftTime = parseTimestampMs(left.createdAt) ?? 0;
    return rightTime - leftTime;
  });
}

async function fetchAuthorFeedPage(
  params: Omit<FetchAuthorPostsParams, 'pageSize' | 'maxItems' | 'since'> & {
    cursor?: string;
    limit: number;
  }
): Promise<AuthorFeedPage> {
  const url = new URL('/xrpc/app.bsky.feed.getAuthorFeed', params.serviceUrl);
  url.searchParams.set('actor', params.authorDid);
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

  const parsed = authorFeedResponseSchema.safeParse(body);

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
    feed: parsed.data.feed
  };
}

async function fetchAuthorPosts(
  params: FetchAuthorPostsParams
): Promise<PostRecord[]> {
  const pageSize = Math.min(Math.max(params.pageSize, 1), MAX_PAGE_SIZE);
  const posts: PostRecord[] = [];
  const sinceMs = params.since?.getTime();
  let cursor: string | undefined = undefined;
  let stopForSince = false;

  do {
    if (params.maxItems && posts.length >= params.maxItems) {
      break;
    }

    const remaining = params.maxItems ? params.maxItems - posts.length : pageSize;
    const limit = Math.min(pageSize, Math.max(remaining, 1));

    const page = await fetchAuthorFeedPage({
      authorDid: params.authorDid,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      fetchImpl: params.fetchImpl,
      cursor,
      limit
    });

    for (const item of page.feed) {
      if (item.post.author.did !== params.authorDid) {
        continue;
      }

      const post = toPostRecord(item);

      if (sinceMs !== undefined) {
        const createdAtMs = parseTimestampMs(post.createdAt);

        if (createdAtMs === null) {
          continue;
        }

        if (createdAtMs < sinceMs) {
          // Author feed is newest-first; stop paging once older items are reached.
          stopForSince = true;
          continue;
        }
      }

      posts.push(post);

      if (params.maxItems && posts.length >= params.maxItems) {
        break;
      }
    }

    cursor = page.cursor;

    if (page.feed.length === 0 || stopForSince) {
      break;
    }
  } while (cursor);

  if (params.maxItems) {
    return posts.slice(0, params.maxItems);
  }

  return posts;
}

function dedupeActors(actors: FollowRecord[]): FollowRecord[] {
  const seen = new Set<string>();
  const deduped: FollowRecord[] = [];

  for (const actor of actors) {
    const key = actor.did || actor.handle;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(actor);
  }

  return deduped;
}

async function resolveSourceActors(
  params: Omit<FetchPostsFromNetworkParams, 'pageSize' | 'maxPosts' | 'since'>
): Promise<FollowRecord[]> {
  if (params.source === 'follows') {
    return fetchAllFollows({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      pageSize: MAX_PAGE_SIZE,
      fetchImpl: params.fetchImpl
    });
  }

  if (params.source === 'followers') {
    return fetchAllFollowers({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      pageSize: MAX_PAGE_SIZE,
      fetchImpl: params.fetchImpl
    });
  }

  const [follows, followers] = await Promise.all([
    fetchAllFollows({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      pageSize: MAX_PAGE_SIZE,
      fetchImpl: params.fetchImpl
    }),
    fetchAllFollowers({
      actor: params.actor,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      pageSize: MAX_PAGE_SIZE,
      fetchImpl: params.fetchImpl
    })
  ]);

  return dedupeActors([...follows, ...followers]);
}

export async function fetchPostsFromNetwork(
  params: FetchPostsFromNetworkParams
): Promise<PostRecord[]> {
  const actors = await resolveSourceActors({
    actor: params.actor,
    source: params.source,
    accessToken: params.accessToken,
    serviceUrl: params.serviceUrl,
    fetchImpl: params.fetchImpl
  });

  if (actors.length === 0) {
    return [];
  }

  const perAuthorMaxItems =
    params.since === undefined ? params.maxPosts : undefined;
  const allPosts: PostRecord[] = [];

  for (const sourceActor of actors) {
    const authorPosts = await fetchAuthorPosts({
      authorDid: sourceActor.did,
      accessToken: params.accessToken,
      serviceUrl: params.serviceUrl,
      pageSize: params.pageSize,
      maxItems: perAuthorMaxItems,
      since: params.since,
      fetchImpl: params.fetchImpl
    });

    allPosts.push(...authorPosts);
  }

  const sorted = sortPostsNewestFirst(allPosts);

  if (params.maxPosts) {
    return sorted.slice(0, params.maxPosts);
  }

  return sorted;
}
