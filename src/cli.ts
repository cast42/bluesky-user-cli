#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';

import { CliContext, createDefaultContext } from './context';
import {
  runFollowsCommand,
  toCommanderValidationError
} from './commands/follows';
import { runFollowersCommand } from './commands/followers';
import { runLikesCommand } from './commands/likes';
import { runPostsCommand } from './commands/posts';
import { isCommanderSignal, toCliError } from './errors';
import { writeCliError } from './lib/output';

export function buildProgram(context: CliContext): Command {
  const program = new Command();

  program
    .name('bluesky-user-cli')
    .description('Fetch follows, followers, likes, and posts for a Bluesky user.')
    .version('0.1.0')
    .option(
      '--access-token <token>',
      'Bluesky access token. Overrides BLUESKY_ACCESS_TOKEN from environment.'
    )
    .option(
      '--identifier <identifier>',
      'Bluesky handle or email used with --app-password to create a session automatically. Overrides BLUESKY_IDENTIFIER.'
    )
    .option(
      '--app-password <password>',
      'Bluesky app password used with --identifier to create a session automatically. Overrides BLUESKY_APP_PASSWORD.'
    )
    .option(
      '--service-url <url>',
      'Bluesky auth service URL. With --identifier/--app-password, the data service endpoint is resolved automatically.'
    )
    .option('--pretty', 'Pretty-print JSON output')
    .configureOutput({
      writeOut: (message) => {
        context.writeStdout(message);
      },
      writeErr: () => {
        // Structured errors are printed by our global error handler.
      },
      outputError: () => {
        // Structured errors are printed by our global error handler.
      }
    })
    .showHelpAfterError(false)
    .exitOverride();

  program
    .command('follows')
    .argument(
      '<actor>',
      'Actor handle, bare username, or DID (example: cast42 or cast42.bsky.social)'
    )
    .description('Fetch the accounts followed by a Bluesky user.')
    .option(
      '--page-size <n>',
      'Page size for each API call (1-100). Default: 100'
    )
    .option('--max-items <n>', 'Optional cap on returned follow records.')
    .addHelpText(
      'after',
      `
Examples:
  bluesky-user-cli follows cast42
  BLUESKY_ACCESS_TOKEN=token bluesky-user-cli follows cast42 --pretty
  bluesky-user-cli follows cast42 --identifier cast42.bsky.social --app-password xxxx-xxxx-xxxx-xxxx --pretty
  BLUESKY_IDENTIFIER=cast42.bsky.social BLUESKY_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx bluesky-user-cli follows cast42 --pretty

Output:
  JSON envelope: { command, target, resolvedActor, serviceUrl, generatedAt, count, data[] }
`
    )
    .action(
      async (
        actor: string,
        localOptions: Record<string, unknown>,
        command: Command
      ) => {
        const mergedOptions = {
          ...command.optsWithGlobals(),
          ...localOptions
        };

        await runFollowsCommand({
          actor,
          options: mergedOptions,
          context
        });
      }
    );

  program
    .command('followers')
    .argument(
      '<actor>',
      'Actor handle, bare username, or DID (example: cast42 or cast42.bsky.social)'
    )
    .description('Fetch the accounts following a Bluesky user.')
    .option(
      '--page-size <n>',
      'Page size for each API call (1-100). Default: 100'
    )
    .option('--max-items <n>', 'Optional cap on returned follower records.')
    .addHelpText(
      'after',
      `
Examples:
  bluesky-user-cli followers cast42
  BLUESKY_ACCESS_TOKEN=token bluesky-user-cli followers cast42 --pretty
  bluesky-user-cli followers cast42 --identifier cast42.bsky.social --app-password xxxx-xxxx-xxxx-xxxx --pretty

Output:
  JSON envelope: { command, target, resolvedActor, serviceUrl, generatedAt, count, data[] }
`
    )
    .action(
      async (
        actor: string,
        localOptions: Record<string, unknown>,
        command: Command
      ) => {
        const mergedOptions = {
          ...command.optsWithGlobals(),
          ...localOptions
        };

        await runFollowersCommand({
          actor,
          options: mergedOptions,
          context
        });
      }
    );

  program
    .command('likes')
    .argument(
      '<actor>',
      'Actor handle, bare username, or DID (example: cast42 or cast42.bsky.social)'
    )
    .description('Fetch posts liked by a Bluesky user.')
    .option(
      '--page-size <n>',
      'Page size for each API call (1-100). Default: 100'
    )
    .option('--max-items <n>', 'Optional cap on returned liked posts.')
    .option(
      '--since <value>',
      'Filter liked posts since this timestamp (ISO, YYYY-MM-DD, today, yesterday).'
    )
    .addHelpText(
      'after',
      `
Examples:
  bluesky-user-cli likes cast42
  bluesky-user-cli likes cast42 --since yesterday --pretty
  BLUESKY_ACCESS_TOKEN=token bluesky-user-cli likes cast42 --since 2026-03-03

Output:
  JSON envelope: { command, target, resolvedActor, serviceUrl, generatedAt, since, count, data[] }
`
    )
    .action(
      async (
        actor: string,
        localOptions: Record<string, unknown>,
        command: Command
      ) => {
        const mergedOptions = {
          ...command.optsWithGlobals(),
          ...localOptions
        };

        await runLikesCommand({
          actor,
          options: mergedOptions,
          context
        });
      }
    );

  program
    .command('posts')
    .argument(
      '<actor>',
      'Actor handle, bare username, or DID (example: cast42 or cast42.bsky.social)'
    )
    .description('Fetch posts from accounts in a user network (follows/followers).')
    .option(
      '--from <source>',
      'Network source: follows, followers, or both. Default: follows'
    )
    .option(
      '--page-size <n>',
      'Page size for each API call (1-100). Default: 100'
    )
    .option(
      '--max-posts <n>',
      'Return at most N newest posts after aggregation/sorting.'
    )
    .option(
      '--since <value>',
      'Return posts since this timestamp (ISO, YYYY-MM-DD, today, yesterday).'
    )
    .addHelpText(
      'after',
      `
Examples:
  bluesky-user-cli posts cast42 --from follows --since yesterday --pretty
  bluesky-user-cli posts cast42 --from followers --max-posts 50 --pretty
  bluesky-user-cli posts cast42 --from both --since 2025-01-20 --max-posts 100

Notes:
  You must provide at least one constraint: --since or --max-posts.

Output:
  JSON envelope: { command, target, resolvedActor, source, serviceUrl, generatedAt, since, count, data[] }
`
    )
    .action(
      async (
        actor: string,
        localOptions: Record<string, unknown>,
        command: Command
      ) => {
        const mergedOptions = {
          ...command.optsWithGlobals(),
          ...localOptions
        };

        await runPostsCommand({
          actor,
          options: mergedOptions,
          context
        });
      }
    );

  return program;
}

export async function runCli(
  argv: string[],
  context: CliContext = createDefaultContext()
): Promise<number> {
  if (context.env === process.env) {
    dotenv.config();
  }

  const program = buildProgram(context);

  try {
    await program.parseAsync(argv);
    return 0;
  } catch (error) {
    if (isCommanderSignal(error)) {
      return 0;
    }

    const cliError = toCliError(toCommanderValidationError(error));
    writeCliError(context, cliError);
    return cliError.exitCode;
  }
}

if (require.main === module) {
  void runCli(process.argv).then((code) => {
    process.exitCode = code;
  });
}
