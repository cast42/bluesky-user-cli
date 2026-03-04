import { z } from 'zod';

import { CliError } from '../errors';

const didDocServiceSchema = z.object({
  id: z.string().optional(),
  serviceEndpoint: z.string().url().optional()
});

const sessionResponseSchema = z.object({
  accessJwt: z.string(),
  did: z.string().optional(),
  didDoc: z
    .object({
      service: z.array(didDocServiceSchema).optional()
    })
    .optional()
});

const plcDirectoryResponseSchema = z.object({
  service: z.array(didDocServiceSchema).optional()
});

interface ResolveAccessTokenParams {
  cliAccessToken?: string;
  env: NodeJS.ProcessEnv;
}

interface ResolveAuthContextParams {
  cliAccessToken?: string;
  cliIdentifier?: string;
  cliAppPassword?: string;
  env: NodeJS.ProcessEnv;
  serviceUrl: string;
  fetchImpl: typeof fetch;
}

export interface ResolvedAuthContext {
  accessToken: string;
  serviceUrl: string;
}

function normalizeOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function getServiceEndpoint(
  services: Array<z.infer<typeof didDocServiceSchema>> | undefined
): string | undefined {
  if (!services || services.length === 0) {
    return undefined;
  }

  const pdsService = services.find(
    (service) => service.id === '#atproto_pds' && service.serviceEndpoint
  );

  if (pdsService?.serviceEndpoint) {
    return pdsService.serviceEndpoint;
  }

  return services.find((service) => service.serviceEndpoint)?.serviceEndpoint;
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function fetchPdsEndpointFromPlc(
  did: string,
  fetchImpl: typeof fetch
): Promise<string> {
  const plcUrl = `https://plc.directory/${encodeURIComponent(did)}`;

  let response: Response;
  try {
    response = await fetchImpl(plcUrl, {
      headers: {
        Accept: 'application/json'
      }
    });
  } catch (error) {
    throw new CliError(
      'API_ERROR',
      'Failed to reach plc.directory while resolving service endpoint.',
      3,
      {
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }

  const body = await readJsonBody(response);

  if (!response.ok) {
    throw new CliError(
      'API_ERROR',
      'Unable to resolve service endpoint from DID.',
      3,
      {
        status: response.status,
        body
      }
    );
  }

  const parsed = plcDirectoryResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new CliError(
      'API_ERROR',
      'plc.directory returned an unexpected response shape.',
      3,
      {
        issues: parsed.error.issues
      }
    );
  }

  const endpoint = getServiceEndpoint(parsed.data.service);

  if (!endpoint) {
    throw new CliError(
      'API_ERROR',
      'No service endpoint found for DID in plc.directory.',
      3,
      {
        did
      }
    );
  }

  return endpoint;
}

async function createSession(
  identifier: string,
  appPassword: string,
  serviceUrl: string,
  fetchImpl: typeof fetch
): Promise<ResolvedAuthContext> {
  const url = new URL('/xrpc/com.atproto.server.createSession', serviceUrl);

  let response: Response;

  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        identifier,
        password: appPassword
      })
    });
  } catch (error) {
    throw new CliError(
      'API_ERROR',
      'Failed to reach Bluesky authentication endpoint.',
      3,
      {
        cause: error instanceof Error ? error.message : String(error)
      }
    );
  }

  const body = await readJsonBody(response);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CliError(
        'AUTH_ERROR',
        'Invalid identifier or app password.',
        2,
        {
          status: response.status,
          body
        }
      );
    }

    throw new CliError(
      'API_ERROR',
      `Bluesky session creation failed (${response.status}).`,
      3,
      {
        status: response.status,
        body
      }
    );
  }

  const parsed = sessionResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new CliError(
      'API_ERROR',
      'Bluesky session response had an unexpected shape.',
      3,
      {
        issues: parsed.error.issues
      }
    );
  }

  let resolvedServiceUrl = getServiceEndpoint(parsed.data.didDoc?.service);

  if (!resolvedServiceUrl && parsed.data.did) {
    resolvedServiceUrl = await fetchPdsEndpointFromPlc(
      parsed.data.did,
      fetchImpl
    );
  }

  if (!resolvedServiceUrl) {
    throw new CliError(
      'API_ERROR',
      'Could not resolve a personal data server endpoint.',
      3
    );
  }

  return {
    accessToken: parsed.data.accessJwt,
    serviceUrl: resolvedServiceUrl
  };
}

export function resolveAccessToken(params: ResolveAccessTokenParams): string {
  const fromCli = normalizeOptional(params.cliAccessToken);
  const fromEnv = normalizeOptional(params.env.BLUESKY_ACCESS_TOKEN);
  const token = fromCli || fromEnv;

  if (!token) {
    throw new CliError(
      'AUTH_ERROR',
      'Missing access token. Provide --access-token or set BLUESKY_ACCESS_TOKEN.',
      2
    );
  }

  return token;
}

export async function resolveAuthContext(
  params: ResolveAuthContextParams
): Promise<ResolvedAuthContext> {
  const accessToken =
    normalizeOptional(params.cliAccessToken) ||
    normalizeOptional(params.env.BLUESKY_ACCESS_TOKEN);
  const identifier =
    normalizeOptional(params.cliIdentifier) ||
    normalizeOptional(params.env.BLUESKY_IDENTIFIER);
  const appPassword =
    normalizeOptional(params.cliAppPassword) ||
    normalizeOptional(params.env.BLUESKY_APP_PASSWORD);

  if (accessToken && (identifier || appPassword)) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Use either token auth (--access-token / BLUESKY_ACCESS_TOKEN) or app-password auth (--identifier / BLUESKY_IDENTIFIER with --app-password / BLUESKY_APP_PASSWORD), not both.',
      4
    );
  }

  if (identifier && !appPassword) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Missing app password. Provide --app-password (or BLUESKY_APP_PASSWORD) with --identifier (or BLUESKY_IDENTIFIER).',
      4
    );
  }

  if (appPassword && !identifier) {
    throw new CliError(
      'VALIDATION_ERROR',
      'Missing identifier. Provide --identifier (or BLUESKY_IDENTIFIER) with --app-password (or BLUESKY_APP_PASSWORD).',
      4
    );
  }

  if (accessToken) {
    return {
      accessToken,
      serviceUrl: params.serviceUrl
    };
  }

  if (identifier && appPassword) {
    return createSession(
      identifier,
      appPassword,
      params.serviceUrl,
      params.fetchImpl
    );
  }

  throw new CliError(
    'AUTH_ERROR',
    'Missing credentials. Provide --access-token (or BLUESKY_ACCESS_TOKEN), or provide --identifier/BLUESKY_IDENTIFIER with --app-password/BLUESKY_APP_PASSWORD.',
    2
  );
}
