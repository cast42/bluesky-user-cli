import { CliContext } from '../context';
import { CliError } from '../errors';
import { JsonEnvelope } from '../types/output';

export function writeEnvelope(
  context: CliContext,
  envelope: JsonEnvelope,
  pretty: boolean
): void {
  const indent = pretty ? 2 : 0;
  context.writeStdout(`${JSON.stringify(envelope, null, indent)}\n`);
}

export function writeCliError(context: CliContext, error: CliError): void {
  const payload = {
    error: {
      code: error.errorCode,
      message: error.message,
      details: error.details ?? {}
    }
  };

  context.writeStderr(`${JSON.stringify(payload)}\n`);
}
