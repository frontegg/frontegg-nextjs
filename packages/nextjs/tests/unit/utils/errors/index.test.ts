import { describe, it, expect } from 'vitest';
import { FronteggEnvNotFound, InvalidFronteggEnv } from '../../../../src/utils/errors';

describe('FronteggEnvNotFound', () => {
  it('lists every missing variable name in the message', () => {
    // Act
    const error = new FronteggEnvNotFound('FRONTEGG_BASE_URL', 'FRONTEGG_CLIENT_ID');

    // Assert
    expect(error.message).toBe(
      'Missing one or more environment variables (FRONTEGG_BASE_URL, FRONTEGG_CLIENT_ID). add it to the .env.local file.'
    );
  });

  it('is an Error and keeps its own prototype for instanceof checks', () => {
    const error = new FronteggEnvNotFound('X');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(FronteggEnvNotFound);
    expect(error).not.toBeInstanceOf(InvalidFronteggEnv);
  });

  it('can be thrown and caught by type', () => {
    const throwIt = () => {
      throw new FronteggEnvNotFound('FRONTEGG_APP_URL');
    };

    expect(throwIt).toThrow(FronteggEnvNotFound);
    expect(throwIt).toThrow(/FRONTEGG_APP_URL/);
  });
});

describe('InvalidFronteggEnv', () => {
  it('describes the invalid variable and the expected type', () => {
    const error = new InvalidFronteggEnv('FRONTEGG_ENCRYPTION_PASSWORD', 'Hex string');

    expect(error.message).toBe(
      'Invalid environment variable (FRONTEGG_ENCRYPTION_PASSWORD), must be a valid Hex string'
    );
  });

  it('is an Error and keeps its own prototype for instanceof checks', () => {
    const error = new InvalidFronteggEnv('A', 'B');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(InvalidFronteggEnv);
    expect(error).not.toBeInstanceOf(FronteggEnvNotFound);
  });
});
