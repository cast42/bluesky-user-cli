import { z } from 'zod';

import { CliContext } from '../context';
import { normalizeActor } from '../lib/actor';
import { resolveAuthContext } from '../lib/auth';
import { fetchAllLikes } from '../lib/bluesky';
import { writeEnvelope } from '../lib/output';
import { parseSinceInput } from '../lib/since';
import { likesEnvelopeSchema } from '../types/output';

const DEFAULT_SERVICE_URL = 'https://bsky.social';

const likesOptionsSchema = z.object({
  accessToken: z.string().optional(),
  identifier: z.string().optional(),
  appPassword: z.string().optional(),
  serviceUrl: z.string().url().default(DEFAULT_SERVICE_URL),
  pretty: z.boolean().default(false),
  pageSize: z.coerce.number().int().positive().max(100).default(100),
  maxItems: z.coerce.number().int().positive().optional(),
  since: z.string().optional()
});

interface RunLikesInput {
  actor: string;
  options: unknown;
  context: CliContext;
}

export async function runLikesCommand(input: RunLikesInput): Promise<void> {
  const normalizedActor = normalizeActor(input.actor);
  const parsedOptions = likesOptionsSchema.parse(input.options);
  const since = parsedOptions.since
    ? parseSinceInput(parsedOptions.since, input.context.now())
    : undefined;

  const authContext = await resolveAuthContext({
    cliAccessToken: parsedOptions.accessToken,
    cliIdentifier: parsedOptions.identifier,
    cliAppPassword: parsedOptions.appPassword,
    env: input.context.env,
    serviceUrl: parsedOptions.serviceUrl,
    fetchImpl: input.context.fetchImpl
  });

  const likes = await fetchAllLikes({
    actor: normalizedActor,
    accessToken: authContext.accessToken,
    serviceUrl: authContext.serviceUrl,
    pageSize: parsedOptions.pageSize,
    maxItems: parsedOptions.maxItems,
    since,
    fetchImpl: input.context.fetchImpl
  });

  const envelope = likesEnvelopeSchema.parse({
    command: 'likes',
    target: input.actor,
    resolvedActor: normalizedActor,
    serviceUrl: authContext.serviceUrl,
    generatedAt: input.context.now().toISOString(),
    since: since ? since.toISOString() : null,
    count: likes.length,
    data: likes
  });

  writeEnvelope(input.context, envelope, parsedOptions.pretty);
}
