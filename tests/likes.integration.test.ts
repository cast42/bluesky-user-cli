import { afterEach, describe, expect, it, vi } from 'vitest';

import { CliError } from '../src/errors';
import { fetchAllLikes } from '../src/lib/bluesky';

describe('fetchAllLikes', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a single page', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          feed: [
            {
              post: {
                uri: 'at://did:plc:author/app.bsky.feed.post/abc123',
                cid: 'bafy1',
                author: {
                  did: 'did:plc:author',
                  handle: 'author.bsky.social',
                  displayName: 'Author'
                },
                record: {
                  text: 'Hello world',
                  createdAt: '2026-03-03T12:00:00.000Z'
                }
              },
              reason: {
                $type: 'app.bsky.feed.defs#reasonLike',
                indexedAt: '2026-03-04T10:00:00.000Z'
              }
            }
          ]
        }),
        { status: 200 }
      );
    });

    const records = await fetchAllLikes({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      uri: 'at://did:plc:author/app.bsky.feed.post/abc123',
      cid: 'bafy1',
      authorDid: 'did:plc:author',
      authorHandle: 'author.bsky.social',
      authorDisplayName: 'Author',
      text: 'Hello world',
      createdAt: '2026-03-03T12:00:00.000Z',
      likedAt: '2026-03-04T10:00:00.000Z'
    });
  });

  it('paginates and honors max items', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cursor: 'next-cursor',
            feed: [
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/1',
                  cid: 'bafy1',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'one',
                    createdAt: '2026-03-03T12:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-04T12:00:00.000Z'
                }
              },
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/2',
                  cid: 'bafy2',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'two',
                    createdAt: '2026-03-03T11:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-04T11:00:00.000Z'
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            feed: [
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/3',
                  cid: 'bafy3',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'three',
                    createdAt: '2026-03-03T10:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-04T10:00:00.000Z'
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const records = await fetchAllLikes({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 2,
      maxItems: 2,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.uri)).toEqual([
      'at://did:plc:author/app.bsky.feed.post/1',
      'at://did:plc:author/app.bsky.feed.post/2'
    ]);
  });

  it('stops paging when reaching since boundary', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cursor: 'next-cursor',
            feed: [
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/newer',
                  cid: 'bafy-newer',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'newer',
                    createdAt: '2026-03-03T12:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-04T12:00:00.000Z'
                }
              },
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/older',
                  cid: 'bafy-older',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'older',
                    createdAt: '2026-03-02T12:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-02T12:00:00.000Z'
                }
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            feed: [
              {
                post: {
                  uri: 'at://did:plc:author/app.bsky.feed.post/too-old',
                  cid: 'bafy-too-old',
                  author: {
                    did: 'did:plc:author',
                    handle: 'author.bsky.social'
                  },
                  record: {
                    text: 'too old',
                    createdAt: '2026-03-01T12:00:00.000Z'
                  }
                },
                reason: {
                  indexedAt: '2026-03-01T12:00:00.000Z'
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const records = await fetchAllLikes({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      since: new Date('2026-03-03T00:00:00.000Z'),
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(1);
    expect(records[0]?.uri).toBe('at://did:plc:author/app.bsky.feed.post/newer');
  });

  it('applies since filter using post createdAt when likedAt is missing', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          feed: [
            {
              post: {
                uri: 'at://did:plc:author/app.bsky.feed.post/recent',
                cid: 'bafy-recent',
                author: {
                  did: 'did:plc:author',
                  handle: 'author.bsky.social'
                },
                record: {
                  text: 'recent',
                  createdAt: '2026-03-03T12:00:00.000Z'
                }
              }
            }
          ]
        }),
        { status: 200 }
      );
    });

    const records = await fetchAllLikes({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      since: new Date('2026-03-03T00:00:00.000Z'),
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.uri).toBe('at://did:plc:author/app.bsky.feed.post/recent');
  });

  it('maps unauthorized responses to auth errors', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401
      });
    });

    await expect(
      fetchAllLikes({
        actor: 'cast42.bsky.social',
        accessToken: 'bad-token',
        serviceUrl: 'https://bsky.social',
        pageSize: 100,
        fetchImpl: fetchMock as unknown as typeof fetch
      })
    ).rejects.toEqual(
      expect.objectContaining<CliError>({
        errorCode: 'AUTH_ERROR',
        exitCode: 2
      })
    );
  });
});
