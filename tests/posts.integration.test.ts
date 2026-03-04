import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchPostsFromNetwork } from '../src/lib/posts';

describe('fetchPostsFromNetwork', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches posts from follows and returns newest first with maxPosts cap', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            follows: [
              {
                did: 'did:plc:one',
                handle: 'one.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              },
              {
                did: 'did:plc:two',
                handle: 'two.bsky.social',
                displayName: null,
                avatar: null,
                description: null
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
                  uri: 'at://did:plc:one/app.bsky.feed.post/older',
                  cid: 'cid-older',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'older',
                    createdAt: '2026-03-01T10:00:00.000Z'
                  }
                }
              },
              {
                post: {
                  uri: 'at://did:plc:one/app.bsky.feed.post/newer',
                  cid: 'cid-newer',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'newer',
                    createdAt: '2026-03-03T10:00:00.000Z'
                  }
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
                  uri: 'at://did:plc:two/app.bsky.feed.post/latest',
                  cid: 'cid-latest',
                  author: {
                    did: 'did:plc:two',
                    handle: 'two.bsky.social'
                  },
                  record: {
                    text: 'latest',
                    createdAt: '2026-03-04T10:00:00.000Z'
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const posts = await fetchPostsFromNetwork({
      actor: 'cast42.bsky.social',
      source: 'follows',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      maxPosts: 2,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(posts).toHaveLength(2);
    expect(posts.map((post) => post.uri)).toEqual([
      'at://did:plc:two/app.bsky.feed.post/latest',
      'at://did:plc:one/app.bsky.feed.post/newer'
    ]);
  });

  it('filters by since and stops paging older posts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            followers: [
              {
                did: 'did:plc:one',
                handle: 'one.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cursor: 'next-cursor',
            feed: [
              {
                post: {
                  uri: 'at://did:plc:one/app.bsky.feed.post/newer',
                  cid: 'cid-newer',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'newer',
                    createdAt: '2026-03-04T10:00:00.000Z'
                  }
                }
              },
              {
                post: {
                  uri: 'at://did:plc:one/app.bsky.feed.post/older',
                  cid: 'cid-older',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'older',
                    createdAt: '2026-03-01T10:00:00.000Z'
                  }
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
                  uri: 'at://did:plc:one/app.bsky.feed.post/too-old',
                  cid: 'cid-too-old',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'too old',
                    createdAt: '2026-02-01T10:00:00.000Z'
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const posts = await fetchPostsFromNetwork({
      actor: 'cast42.bsky.social',
      source: 'followers',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      since: new Date('2026-03-03T00:00:00.000Z'),
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    // getFollowers + first page only (older boundary reached in page 1).
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.uri).toBe('at://did:plc:one/app.bsky.feed.post/newer');
  });

  it('supports source=both and de-duplicates overlapping accounts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            follows: [
              {
                did: 'did:plc:one',
                handle: 'one.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              }
            ]
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            followers: [
              {
                did: 'did:plc:one',
                handle: 'one.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              },
              {
                did: 'did:plc:two',
                handle: 'two.bsky.social',
                displayName: null,
                avatar: null,
                description: null
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
                  uri: 'at://did:plc:one/app.bsky.feed.post/a',
                  cid: 'cid-a',
                  author: {
                    did: 'did:plc:one',
                    handle: 'one.bsky.social'
                  },
                  record: {
                    text: 'a',
                    createdAt: '2026-03-04T08:00:00.000Z'
                  }
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
                  uri: 'at://did:plc:two/app.bsky.feed.post/b',
                  cid: 'cid-b',
                  author: {
                    did: 'did:plc:two',
                    handle: 'two.bsky.social'
                  },
                  record: {
                    text: 'b',
                    createdAt: '2026-03-04T09:00:00.000Z'
                  }
                }
              }
            ]
          }),
          { status: 200 }
        )
      );

    const posts = await fetchPostsFromNetwork({
      actor: 'cast42.bsky.social',
      source: 'both',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      maxPosts: 10,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(posts).toHaveLength(2);
    expect(posts.map((post) => post.authorDid)).toEqual([
      'did:plc:two',
      'did:plc:one'
    ]);
  });
});
