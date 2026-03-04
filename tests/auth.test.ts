import { describe, expect, it, vi } from 'vitest';

import { CliError } from '../src/errors';
import { resolveAccessToken, resolveAuthContext } from '../src/lib/auth';

describe('resolveAccessToken', () => {
  it('prefers --access-token over env var', () => {
    const token = resolveAccessToken({
      cliAccessToken: 'cli-token',
      env: { BLUESKY_ACCESS_TOKEN: 'env-token' }
    });

    expect(token).toBe('cli-token');
  });

  it('uses env token when cli token missing', () => {
    const token = resolveAccessToken({
      env: { BLUESKY_ACCESS_TOKEN: 'env-token' }
    });

    expect(token).toBe('env-token');
  });
});

describe('resolveAuthContext', () => {
  it('uses token auth when token is available', async () => {
    const auth = await resolveAuthContext({
      cliAccessToken: 'cli-token',
      env: {},
      serviceUrl: 'https://bsky.social',
      fetchImpl: vi.fn() as unknown as typeof fetch
    });

    expect(auth).toEqual({
      accessToken: 'cli-token',
      serviceUrl: 'https://bsky.social'
    });
  });

  it('creates session and resolves endpoint from didDoc', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          accessJwt: 'session-token',
          did: 'did:plc:abc123',
          didDoc: {
            service: [
              {
                id: '#atproto_pds',
                serviceEndpoint: 'https://oyster.us-east.host.bsky.network'
              }
            ]
          }
        }),
        { status: 200 }
      );
    });

    const auth = await resolveAuthContext({
      cliIdentifier: 'cast42.bsky.social',
      cliAppPassword: 'xxxx-xxxx-xxxx-xxxx',
      env: {},
      serviceUrl: 'https://bsky.social',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auth).toEqual({
      accessToken: 'session-token',
      serviceUrl: 'https://oyster.us-east.host.bsky.network'
    });
  });

  it('creates session from BLUESKY_IDENTIFIER and BLUESKY_APP_PASSWORD', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          accessJwt: 'session-token',
          did: 'did:plc:abc123',
          didDoc: {
            service: [
              {
                id: '#atproto_pds',
                serviceEndpoint: 'https://oyster.us-east.host.bsky.network'
              }
            ]
          }
        }),
        { status: 200 }
      );
    });

    const auth = await resolveAuthContext({
      env: {
        BLUESKY_IDENTIFIER: 'cast42.bsky.social',
        BLUESKY_APP_PASSWORD: 'xxxx-xxxx-xxxx-xxxx'
      },
      serviceUrl: 'https://bsky.social',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auth).toEqual({
      accessToken: 'session-token',
      serviceUrl: 'https://oyster.us-east.host.bsky.network'
    });
  });

  it('falls back to plc.directory when didDoc endpoint is missing', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessJwt: 'session-token',
            did: 'did:plc:abc123'
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            service: [
              {
                id: '#atproto_pds',
                serviceEndpoint: 'https://resolved-from-plc.example'
              }
            ]
          }),
          { status: 200 }
        )
      );

    const auth = await resolveAuthContext({
      cliIdentifier: 'cast42.bsky.social',
      cliAppPassword: 'xxxx-xxxx-xxxx-xxxx',
      env: {},
      serviceUrl: 'https://bsky.social',
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auth).toEqual({
      accessToken: 'session-token',
      serviceUrl: 'https://resolved-from-plc.example'
    });
  });

  it('rejects mixed auth methods', async () => {
    await expect(
      resolveAuthContext({
        cliAccessToken: 'token',
        cliIdentifier: 'cast42.bsky.social',
        cliAppPassword: 'xxxx-xxxx-xxxx-xxxx',
        env: {},
        serviceUrl: 'https://bsky.social',
        fetchImpl: vi.fn() as unknown as typeof fetch
      })
    ).rejects.toEqual(
      expect.objectContaining<CliError>({
        errorCode: 'VALIDATION_ERROR',
        exitCode: 4
      })
    );
  });
});
