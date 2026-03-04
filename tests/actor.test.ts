import { describe, expect, it } from 'vitest';

import { normalizeActor } from '../src/lib/actor';

describe('normalizeActor', () => {
  it('appends default domain for bare username', () => {
    expect(normalizeActor('cast42')).toBe('cast42.bsky.social');
  });

  it('keeps full handle unchanged except lowercasing', () => {
    expect(normalizeActor('Cast42.Bsky.Social')).toBe('cast42.bsky.social');
  });

  it('keeps did unchanged', () => {
    expect(normalizeActor('did:plc:abc123')).toBe('did:plc:abc123');
  });
});
