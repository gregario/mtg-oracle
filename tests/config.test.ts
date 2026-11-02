import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  it('defaults to stdio', () => {
    expect(resolveConfig([], {})).toEqual({ transport: 'stdio' });
  });

  it('selects HTTP with --http, listening on localhost:3000 by default', () => {
    expect(resolveConfig(['--http'], {})).toEqual({ transport: 'http', host: '127.0.0.1', port: 3000 });
  });

  it('selects HTTP with MTG_ORACLE_TRANSPORT=http', () => {
    expect(resolveConfig([], { MTG_ORACLE_TRANSPORT: 'http' })).toMatchObject({ transport: 'http' });
  });

  it('reads host and port from the environment', () => {
    expect(resolveConfig(['--http'], { MTG_ORACLE_HOST: '0.0.0.0', MTG_ORACLE_PORT: '8080' })).toEqual({
      transport: 'http',
      host: '0.0.0.0',
      port: 8080,
    });
  });

  it('rejects an unknown transport', () => {
    expect(() => resolveConfig([], { MTG_ORACLE_TRANSPORT: 'sse' })).toThrow(/MTG_ORACLE_TRANSPORT/);
  });

  it('rejects an invalid port', () => {
    expect(() => resolveConfig(['--http'], { MTG_ORACLE_PORT: 'eighty' })).toThrow(/MTG_ORACLE_PORT/);
    expect(() => resolveConfig(['--http'], { MTG_ORACLE_PORT: '70000' })).toThrow(/MTG_ORACLE_PORT/);
  });
});
