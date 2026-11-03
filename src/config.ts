/**
 * Runtime configuration from command-line flags and environment variables.
 */

export type Config = {
  /** Data directory; undefined means the default (~/.mtg-oracle). */
  dataDir: string | undefined;
  /** Hours between background data refresh checks; 0 disables them. */
  refreshHours: number;
} & (
  | { transport: 'stdio' }
  | { transport: 'http'; host: string; port: number }
);

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3000;
const DEFAULT_REFRESH_HOURS = 24;

/**
 * Resolves the runtime configuration.
 *
 * stdio is the default. HTTP is selected with `--http` or `MTG_ORACLE_TRANSPORT=http`,
 * and listens on `MTG_ORACLE_HOST` (default 127.0.0.1) and `MTG_ORACLE_PORT` (default 3000).
 * `MTG_ORACLE_DATA_DIR` overrides the data directory, and `MTG_ORACLE_REFRESH_HOURS`
 * (default 24, 0 to disable) sets how often a running server checks for new data.
 * Throws on invalid values rather than silently falling back.
 */
export function resolveConfig(argv: string[], env: NodeJS.ProcessEnv): Config {
  const transport = argv.includes('--http') ? 'http' : (env.MTG_ORACLE_TRANSPORT ?? 'stdio');

  const dataDir = env.MTG_ORACLE_DATA_DIR;
  if (dataDir === '') {
    throw new Error('MTG_ORACLE_DATA_DIR must not be empty; unset it to use the default');
  }

  const refreshHours = env.MTG_ORACLE_REFRESH_HOURS === undefined ? DEFAULT_REFRESH_HOURS : Number(env.MTG_ORACLE_REFRESH_HOURS);
  if (!Number.isFinite(refreshHours) || refreshHours < 0) {
    throw new Error(`MTG_ORACLE_REFRESH_HOURS must be a number of hours, 0 or more, got "${env.MTG_ORACLE_REFRESH_HOURS}"`);
  }

  if (transport === 'stdio') {
    return { transport, dataDir, refreshHours };
  }
  if (transport !== 'http') {
    throw new Error(`MTG_ORACLE_TRANSPORT must be "stdio" or "http", got "${transport}"`);
  }

  const host = env.MTG_ORACLE_HOST ?? DEFAULT_HOST;
  const port = env.MTG_ORACLE_PORT === undefined ? DEFAULT_PORT : Number(env.MTG_ORACLE_PORT);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`MTG_ORACLE_PORT must be an integer from 0 to 65535, got "${env.MTG_ORACLE_PORT}"`);
  }

  return { transport, host, port, dataDir, refreshHours };
}
