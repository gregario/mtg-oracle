import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  it('defaults to stdio, the default data directory, and a daily refresh', () => {
    expect(resolveConfig([], {})).toEqual({ transport: 'stdio', dataDir: undefined, refreshHours: 24 });
  });

  it('selects HTTP with --http, listening on localhost:3000 by default', () => {
    expect(resolveConfig(['--http'], {})).toMatchObject({ transport: 'http', host: '127.0.0.1', port: 3000 });
  });

  it('selects HTTP with MTG_ORACLE_TRANSPORT=http', () => {
    expect(resolveConfig([], { MTG_ORACLE_TRANSPORT: 'http' })).toMatchObject({ transport: 'http' });
  });

  it('reads host and port from the environment', () => {
    expect(resolveConfig(['--http'], { MTG_ORACLE_HOST: '0.0.0.0', MTG_ORACLE_PORT: '8080' })).toMatchObject({
      transport: 'http',
      host: '0.0.0.0',
      port: 8080,
    });
  });

  it('reads the data directory from MTG_ORACLE_DATA_DIR', () => {
    expect(resolveConfig([], { MTG_ORACLE_DATA_DIR: '/data' })).toMatchObject({ dataDir: '/data' });
  });

  it('reads the refresh interval from MTG_ORACLE_REFRESH_HOURS, where 0 disables it', () => {
    expect(resolveConfig([], { MTG_ORACLE_REFRESH_HOURS: '6' })).toMatchObject({ refreshHours: 6 });
    expect(resolveConfig([], { MTG_ORACLE_REFRESH_HOURS: '0.5' })).toMatchObject({ refreshHours: 0.5 });
    expect(resolveConfig([], { MTG_ORACLE_REFRESH_HOURS: '0' })).toMatchObject({ refreshHours: 0 });
  });

  it('rejects an unknown transport', () => {
    expect(() => resolveConfig([], { MTG_ORACLE_TRANSPORT: 'sse' })).toThrow(/MTG_ORACLE_TRANSPORT/);
  });

  it('rejects an invalid port', () => {
    expect(() => resolveConfig(['--http'], { MTG_ORACLE_PORT: 'eighty' })).toThrow(/MTG_ORACLE_PORT/);
    expect(() => resolveConfig(['--http'], { MTG_ORACLE_PORT: '70000' })).toThrow(/MTG_ORACLE_PORT/);
  });

  it('rejects an invalid refresh interval', () => {
    expect(() => resolveConfig([], { MTG_ORACLE_REFRESH_HOURS: 'daily' })).toThrow(/MTG_ORACLE_REFRESH_HOURS/);
    expect(() => resolveConfig([], { MTG_ORACLE_REFRESH_HOURS: '-1' })).toThrow(/MTG_ORACLE_REFRESH_HOURS/);
  });

  it('rejects an empty data directory', () => {
    expect(() => resolveConfig([], { MTG_ORACLE_DATA_DIR: '' })).toThrow(/MTG_ORACLE_DATA_DIR/);
  });
});
