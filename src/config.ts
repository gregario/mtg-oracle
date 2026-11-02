/**
 * Runtime configuration from command-line flags and environment variables.
 */

export type Config =
  | { transport: 'stdio' }
  | { transport: 'http'; host: string; port: number };

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;

/**
 * Resolves the transport configuration.
 *
 * stdio is the default. HTTP is selected with `--http` or `MTG_ORACLE_TRANSPORT=http`,
 * and listens on `MTG_ORACLE_HOST` (default 127.0.0.1) and `MTG_ORACLE_PORT` (default 3000).
 * Throws on invalid values rather than silently falling back.
 */
export function resolveConfig(argv: string[], env: NodeJS.ProcessEnv): Config {
  const transport = argv.includes('--http') ? 'http' : (env.MTG_ORACLE_TRANSPORT ?? 'stdio');

  if (transport === 'stdio') {
    return { transport };
  }
  if (transport !== 'http') {
    throw new Error(`MTG_ORACLE_TRANSPORT must be "stdio" or "http", got "${transport}"`);
  }

  const host = env.MTG_ORACLE_HOST ?? DEFAULT_HOST;
  const port = env.MTG_ORACLE_PORT === undefined ? DEFAULT_PORT : Number(env.MTG_ORACLE_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`MTG_ORACLE_PORT must be an integer from 0 to 65535, got "${env.MTG_ORACLE_PORT}"`);
  }

  return { transport, host, port };
}
