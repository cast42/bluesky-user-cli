import { CommanderError } from 'commander';
import { ZodError } from 'zod';

export type ErrorCode = 'AUTH_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR';

export class CliError extends Error {
  readonly errorCode: ErrorCode;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(
    errorCode: ErrorCode,
    message: string,
    exitCode: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'CliError';
    this.errorCode = errorCode;
    this.exitCode = exitCode;
    this.details = details;
  }
}

export function isCommanderSignal(error: unknown): boolean {
  return (
    error instanceof CommanderError &&
    (error.code === 'commander.helpDisplayed' ||
      error.code === 'commander.version')
  );
}

export function toCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new CliError('VALIDATION_ERROR', 'Invalid input.', 4, {
      issues: error.issues
    });
  }

  if (error instanceof CommanderError) {
    return new CliError('VALIDATION_ERROR', error.message, 4, {
      commanderCode: error.code
    });
  }

  if (error instanceof Error) {
    return new CliError('API_ERROR', error.message, 3);
  }

  return new CliError('API_ERROR', 'Unexpected error.', 3, { cause: error });
}
