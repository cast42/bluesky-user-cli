import { describe, expect, it } from 'vitest';

import {
  followersEnvelopeSchema,
  followsEnvelopeSchema,
  likesEnvelopeSchema,
  postsEnvelopeSchema
} from '../src/types/output';

describe('follows envelope schema', () => {
  it('validates expected output shape', () => {
    const envelope = {
      command: 'follows',
      target: 'cast42',
      resolvedActor: 'cast42.bsky.social',
      serviceUrl: 'https://bsky.social',
      generatedAt: '2026-03-04T10:00:00.000Z',
      count: 1,
      data: [
        {
          did: 'did:plc:1',
          handle: 'one.bsky.social',
          displayName: 'One',
          avatar: null,
          description: null
        }
      ]
    };

    const result = followsEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});

describe('followers envelope schema', () => {
  it('validates expected output shape', () => {
    const envelope = {
      command: 'followers',
      target: 'cast42',
      resolvedActor: 'cast42.bsky.social',
      serviceUrl: 'https://bsky.social',
      generatedAt: '2026-03-04T10:00:00.000Z',
      count: 1,
      data: [
        {
          did: 'did:plc:1',
          handle: 'one.bsky.social',
          displayName: 'One',
          avatar: null,
          description: null
        }
      ]
    };

    const result = followersEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});

describe('likes envelope schema', () => {
  it('validates expected output shape', () => {
    const envelope = {
      command: 'likes',
      target: 'cast42',
      resolvedActor: 'cast42.bsky.social',
      serviceUrl: 'https://bsky.social',
      generatedAt: '2026-03-04T10:00:00.000Z',
      since: '2026-03-03T00:00:00.000Z',
      count: 1,
      data: [
        {
          uri: 'at://did:plc:post/app.bsky.feed.post/abc123',
          cid: 'bafycid',
          authorDid: 'did:plc:author',
          authorHandle: 'author.bsky.social',
          authorDisplayName: 'Author',
          text: 'Hello world',
          createdAt: '2026-03-03T12:00:00.000Z',
          likedAt: '2026-03-04T08:00:00.000Z'
        }
      ]
    };

    const result = likesEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});

describe('posts envelope schema', () => {
  it('validates expected output shape', () => {
    const envelope = {
      command: 'posts',
      target: 'cast42',
      resolvedActor: 'cast42.bsky.social',
      source: 'follows',
      serviceUrl: 'https://bsky.social',
      generatedAt: '2026-03-04T10:00:00.000Z',
      since: '2026-03-03T00:00:00.000Z',
      count: 1,
      data: [
        {
          uri: 'at://did:plc:author/app.bsky.feed.post/abc123',
          cid: 'bafycid',
          authorDid: 'did:plc:author',
          authorHandle: 'author.bsky.social',
          authorDisplayName: 'Author',
          text: 'Hello world',
          createdAt: '2026-03-03T12:00:00.000Z'
        }
      ]
    };

    const result = postsEnvelopeSchema.safeParse(envelope);
    expect(result.success).toBe(true);
  });
});
