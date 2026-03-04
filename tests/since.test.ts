import { describe, expect, it } from 'vitest';

import { CliError } from '../src/errors';
import { parseSinceInput } from '../src/lib/since';

describe('parseSinceInput', () => {
  it('parses yesterday as previous local day start', () => {
    const now = new Date(2026, 2, 4, 18, 11, 1, 0);
    const parsed = parseSinceInput('yesterday', now);

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(3);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getSeconds()).toBe(0);
  });

  it('accepts yesterdat alias', () => {
    const now = new Date(2026, 2, 4, 18, 11, 1, 0);
    const parsed = parseSinceInput('yesterdat', now);

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(3);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
    expect(parsed.getSeconds()).toBe(0);
  });

  it('parses date-only values as local day start', () => {
    const parsed = parseSinceInput('2026-03-01', new Date(2026, 2, 4, 10, 0, 0));

    expect(parsed.toISOString()).toBe('2026-03-01T00:00:00.000Z');
  });

  it('parses ISO datetime values', () => {
    const parsed = parseSinceInput(
      '2026-03-03T12:34:56.000Z',
      new Date(2026, 2, 4, 10, 0, 0)
    );

    expect(parsed.toISOString()).toBe('2026-03-03T12:34:56.000Z');
  });

  it('throws validation error for invalid values', () => {
    expect(() => parseSinceInput('not-a-date', new Date())).toThrowError(
      expect.objectContaining<CliError>({
        errorCode: 'VALIDATION_ERROR',
        exitCode: 4
      })
    );
  });
});
