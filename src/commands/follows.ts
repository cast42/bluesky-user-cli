import { z } from 'zod';

import { CliContext } from '../context';
import { CliError } from '../errors';
import { normalizeActor } from '../lib/actor';
import { resolveAuthContext } from '../lib/auth';
import { fetchAllFollows } from '../lib/bluesky';
import { writeEnvelope } from '../lib/output';
import { followsEnvelopeSchema } from '../types/output';

const DEFAULT_SERVICE_URL = 'https://bsky.social';

const followsOptionsSchema = z.object({
  accessToken: z.string().optional(),
  identifier: z.string().optional(),
  appPassword: z.string().optional(),
  serviceUrl: z.string().url().default(DEFAULT_SERVICE_URL),
  pretty: z.boolean().default(false),
  pageSize: z.coerce.number().int().positive().max(100).default(100),
  maxItems: z.coerce.number().int().positive().optional()
});

interface RunFollowsInput {
  actor: string;
  options: unknown;
  context: CliContext;
}

export async function runFollowsCommand(input: RunFollowsInput): Promise<void> {
  const normalizedActor = normalizeActor(input.actor);
  const parsedOptions = followsOptionsSchema.parse(input.options);

  const authContext = await resolveAuthContext({
    cliAccessToken: parsedOptions.accessToken,
    cliIdentifier: parsedOptions.identifier,
    cliAppPassword: parsedOptions.appPassword,
    env: input.context.env,
    serviceUrl: parsedOptions.serviceUrl,
    fetchImpl: input.context.fetchImpl
  });

  const follows = await fetchAllFollows({
    actor: normalizedActor,
    accessToken: authContext.accessToken,
    serviceUrl: authContext.serviceUrl,
    pageSize: parsedOptions.pageSize,
    maxItems: parsedOptions.maxItems,
    fetchImpl: input.context.fetchImpl
  });

  const envelope = followsEnvelopeSchema.parse({
    command: 'follows',
    target: input.actor,
    resolvedActor: normalizedActor,
    serviceUrl: authContext.serviceUrl,
    generatedAt: input.context.now().toISOString(),
    count: follows.length,
    data: follows
  });

  writeEnvelope(input.context, envelope, parsedOptions.pretty);
}

export function getDefaultServiceUrl(): string {
  return DEFAULT_SERVICE_URL;
}

export function getFollowsOptionsSchema(): typeof followsOptionsSchema {
  return followsOptionsSchema;
}

export function toCommanderValidationError(error: unknown): unknown {
  if (error instanceof z.ZodError) {
    return new CliError('VALIDATION_ERROR', 'Invalid command options.', 4, {
      issues: error.issues
    });
  }

  return error;
}
