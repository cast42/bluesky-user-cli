import { z } from 'zod';

import { CliContext } from '../context';
import { normalizeActor } from '../lib/actor';
import { resolveAuthContext } from '../lib/auth';
import { fetchAllFollowers } from '../lib/bluesky';
import { writeEnvelope } from '../lib/output';
import { followersEnvelopeSchema } from '../types/output';

const DEFAULT_SERVICE_URL = 'https://bsky.social';

const followersOptionsSchema = z.object({
  accessToken: z.string().optional(),
  identifier: z.string().optional(),
  appPassword: z.string().optional(),
  serviceUrl: z.string().url().default(DEFAULT_SERVICE_URL),
  pretty: z.boolean().default(false),
  pageSize: z.coerce.number().int().positive().max(100).default(100),
  maxItems: z.coerce.number().int().positive().optional()
});

interface RunFollowersInput {
  actor: string;
  options: unknown;
  context: CliContext;
}

export async function runFollowersCommand(
  input: RunFollowersInput
): Promise<void> {
  const normalizedActor = normalizeActor(input.actor);
  const parsedOptions = followersOptionsSchema.parse(input.options);

  const authContext = await resolveAuthContext({
    cliAccessToken: parsedOptions.accessToken,
    cliIdentifier: parsedOptions.identifier,
    cliAppPassword: parsedOptions.appPassword,
    env: input.context.env,
    serviceUrl: parsedOptions.serviceUrl,
    fetchImpl: input.context.fetchImpl
  });

  const followers = await fetchAllFollowers({
    actor: normalizedActor,
    accessToken: authContext.accessToken,
    serviceUrl: authContext.serviceUrl,
    pageSize: parsedOptions.pageSize,
    maxItems: parsedOptions.maxItems,
    fetchImpl: input.context.fetchImpl
  });

  const envelope = followersEnvelopeSchema.parse({
    command: 'followers',
    target: input.actor,
    resolvedActor: normalizedActor,
    serviceUrl: authContext.serviceUrl,
    generatedAt: input.context.now().toISOString(),
    count: followers.length,
    data: followers
  });

  writeEnvelope(input.context, envelope, parsedOptions.pretty);
}
