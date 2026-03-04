import { z } from 'zod';

import { CliContext } from '../context';
import { CliError } from '../errors';
import { normalizeActor } from '../lib/actor';
import { resolveAuthContext } from '../lib/auth';
import { writeEnvelope } from '../lib/output';
import { fetchPostsFromNetwork, NetworkSource } from '../lib/posts';
import { parseSinceInput } from '../lib/since';
import { postsEnvelopeSchema } from '../types/output';

const DEFAULT_SERVICE_URL = 'https://bsky.social';

const postsOptionsSchema = z.object({
  accessToken: z.string().optional(),
  identifier: z.string().optional(),
  appPassword: z.string().optional(),
  serviceUrl: z.string().url().default(DEFAULT_SERVICE_URL),
  pretty: z.boolean().default(false),
  pageSize: z.coerce.number().int().positive().max(100).default(100),
  maxPosts: z.coerce.number().int().positive().optional(),
  since: z.string().optional(),
  from: z.enum(['follows', 'followers', 'both']).default('follows')
});

interface RunPostsInput {
  actor: string;
  options: unknown;
  context: CliContext;
}

export async function runPostsCommand(input: RunPostsInput): Promise<void> {
  const normalizedActor = normalizeActor(input.actor);
  const parsedOptions = postsOptionsSchema.parse(input.options);

  if (!parsedOptions.since && !parsedOptions.maxPosts) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Provide at least one posts constraint: --since <date> or --max-posts <n>.',
      4
    );
  }

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

  const posts = await fetchPostsFromNetwork({
    actor: normalizedActor,
    source: parsedOptions.from as NetworkSource,
    accessToken: authContext.accessToken,
    serviceUrl: authContext.serviceUrl,
    pageSize: parsedOptions.pageSize,
    maxPosts: parsedOptions.maxPosts,
    since,
    fetchImpl: input.context.fetchImpl
  });

  const envelope = postsEnvelopeSchema.parse({
    command: 'posts',
    target: input.actor,
    resolvedActor: normalizedActor,
    source: parsedOptions.from,
    serviceUrl: authContext.serviceUrl,
    generatedAt: input.context.now().toISOString(),
    since: since ? since.toISOString() : null,
    count: posts.length,
    data: posts
  });

  writeEnvelope(input.context, envelope, parsedOptions.pretty);
}
