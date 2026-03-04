import { CliError } from '../errors';

export function normalizeActor(actor: string): string {
  const trimmed = actor.trim();

  if (!trimmed) {
    throw new CliError('VALIDATION_ERROR', 'Actor is required.', 4);
  }

  if (trimmed.startsWith('did:')) {
    return trimmed;
  }

  if (trimmed.includes('.')) {
    return trimmed.toLowerCase();
  }

  return `${trimmed.toLowerCase()}.bsky.social`;
}
