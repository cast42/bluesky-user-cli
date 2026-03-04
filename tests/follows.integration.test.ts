import { afterEach, describe, expect, it, vi } from 'vitest';

import { CliError } from '../src/errors';
import { fetchAllFollows } from '../src/lib/bluesky';

describe('fetchAllFollows', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches a single page', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          follows: [
            {
              did: 'did:plc:1',
              handle: 'one.bsky.social',
              displayName: 'One',
              avatar: null,
              description: null
            }
          ]
        }),
        { status: 200 }
      );
    });

    const records = await fetchAllFollows({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 100,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.handle).toBe('one.bsky.social');
  });

  it('paginates with cursors and honors max items', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            cursor: 'next-cursor',
            follows: [
              {
                did: 'did:plc:1',
                handle: 'one.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              },
              {
                did: 'did:plc:2',
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
            follows: [
              {
                did: 'did:plc:3',
                handle: 'three.bsky.social',
                displayName: null,
                avatar: null,
                description: null
              }
            ]
          }),
          { status: 200 }
        )
      );

    const records = await fetchAllFollows({
      actor: 'cast42.bsky.social',
      accessToken: 'token',
      serviceUrl: 'https://bsky.social',
      pageSize: 2,
      maxItems: 2,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(2);
    expect(records.map((record) => record.handle)).toEqual([
      'one.bsky.social',
      'two.bsky.social'
    ]);
  });

  it('maps unauthorized responses to auth errors', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401
      });
    });

    await expect(
      fetchAllFollows({
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
