import { describe, expect, it, vi } from 'vitest';

import { buildProgram, runCli } from '../src/cli';
import { CliContext } from '../src/context';

function createTestContext(): {
  context: CliContext;
  stdout: string[];
  stderr: string[];
} {
  const stdout: string[] = [];
  const stderr: string[] = [];

  return {
    context: {
      env: {},
      fetchImpl: vi.fn() as unknown as typeof fetch,
      writeStdout: (text: string) => {
        stdout.push(text);
      },
      writeStderr: (text: string) => {
        stderr.push(text);
      },
      now: () => new Date('2026-03-04T10:00:00.000Z')
    },
    stdout,
    stderr
  };
}

describe('cli help', () => {
  it('renders root help text', () => {
    const { context } = createTestContext();
    const help = buildProgram(context).helpInformation();

    expect(help).toMatchSnapshot();
  });

  it('renders follows help text', () => {
    const { context } = createTestContext();
    const program = buildProgram(context);
    const follows = program.commands.find(
      (command) => command.name() === 'follows'
    );

    expect(follows?.helpInformation()).toMatchSnapshot();
  });

  it('renders followers help text', () => {
    const { context } = createTestContext();
    const program = buildProgram(context);
    const followers = program.commands.find(
      (command) => command.name() === 'followers'
    );

    expect(followers?.helpInformation()).toMatchSnapshot();
  });

  it('renders likes help text', () => {
    const { context } = createTestContext();
    const program = buildProgram(context);
    const likes = program.commands.find((command) => command.name() === 'likes');

    expect(likes?.helpInformation()).toMatchSnapshot();
  });

  it('renders posts help text', () => {
    const { context } = createTestContext();
    const program = buildProgram(context);
    const posts = program.commands.find((command) => command.name() === 'posts');

    expect(posts?.helpInformation()).toMatchSnapshot();
  });
});

describe('cli errors', () => {
  it('returns validation error for missing actor argument', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(['node', 'cli', 'follows'], context);

    expect(exitCode).toBe(4);
    expect(stderr[0]).toContain('VALIDATION_ERROR');
  });

  it('returns auth error for missing token', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(
      ['node', 'cli', 'follows', 'cast42'],
      context
    );

    expect(exitCode).toBe(2);
    expect(stderr[0]).toContain('AUTH_ERROR');
  });

  it('returns auth error for likes when credentials are missing', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(['node', 'cli', 'likes', 'cast42'], context);

    expect(exitCode).toBe(2);
    expect(stderr[0]).toContain('AUTH_ERROR');
  });

  it('returns auth error for followers when credentials are missing', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(
      ['node', 'cli', 'followers', 'cast42'],
      context
    );

    expect(exitCode).toBe(2);
    expect(stderr[0]).toContain('AUTH_ERROR');
  });

  it('returns validation error when posts constraints are missing', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(['node', 'cli', 'posts', 'cast42'], context);

    expect(exitCode).toBe(4);
    expect(stderr[0]).toContain('VALIDATION_ERROR');
  });

  it('returns auth error for posts when credentials are missing', async () => {
    const { context, stderr } = createTestContext();

    const exitCode = await runCli(
      ['node', 'cli', 'posts', 'cast42', '--max-posts', '20'],
      context
    );

    expect(exitCode).toBe(2);
    expect(stderr[0]).toContain('AUTH_ERROR');
  });
});
