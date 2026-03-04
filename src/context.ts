export interface CliContext {
  env: NodeJS.ProcessEnv;
  fetchImpl: typeof fetch;
  writeStdout: (text: string) => void;
  writeStderr: (text: string) => void;
  now: () => Date;
}

export function createDefaultContext(): CliContext {
  return {
    env: process.env,
    fetchImpl: fetch,
    writeStdout: (text: string) => {
      process.stdout.write(text);
    },
    writeStderr: (text: string) => {
      process.stderr.write(text);
    },
    now: () => new Date()
  };
}
