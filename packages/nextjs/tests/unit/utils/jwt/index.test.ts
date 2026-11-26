// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT, type JWK, type KeyLike } from 'jose';

const ALG = 'RS256';

const mockConfig = vi.hoisted(() => ({ jwtPublicKeyJson: undefined as string | undefined }));
const mockApi = vi.hoisted(() => ({ loadPublicKey: vi.fn() }));

vi.mock('../../../../src/config', () => ({ default: mockConfig }));
vi.mock('../../../../src/api', () => ({ default: mockApi }));

type JwtModule = typeof import('../../../../src/utils/jwt');

let signingKey: KeyLike;
let publicJwk: JWK;
let otherSigningKey: KeyLike;
let otherPublicJwk: JWK;

async function createKeyPair(): Promise<{ privateKey: KeyLike; jwk: JWK }> {
  const { privateKey, publicKey } = await generateKeyPair(ALG, { extractable: true });
  const jwk = { ...(await exportJWK(publicKey)), alg: ALG };
  return { privateKey, jwk };
}

function signToken(key: KeyLike, claims: Record<string, unknown> = {}, expiresIn: string | number = '1h') {
  return new SignJWT({ email: 'user@example.com', ...claims })
    .setProtectedHeader({ alg: ALG })
    .setSubject('user-1')
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/** The module exports a singleton that caches the public key, so load a fresh copy per test. */
async function loadJwtManager() {
  vi.resetModules();
  const mod: JwtModule = await import('../../../../src/utils/jwt');
  return mod.default;
}

beforeAll(async () => {
  const primary = await createKeyPair();
  signingKey = primary.privateKey;
  publicJwk = primary.jwk;
  const other = await createKeyPair();
  otherSigningKey = other.privateKey;
  otherPublicJwk = other.jwk;
});

beforeEach(() => {
  mockConfig.jwtPublicKeyJson = undefined;
  mockApi.loadPublicKey.mockReset();
});

describe('JwtManager.verify with FRONTEGG_JWT_PUBLIC_KEY', () => {
  it('verifies a token signed by the configured public key and returns its payload', async () => {
    // Arrange
    mockConfig.jwtPublicKeyJson = JSON.stringify(publicJwk);
    const JwtManager = await loadJwtManager();
    const token = await signToken(signingKey, { tenantId: 't-1' });

    // Act
    const { payload, protectedHeader } = await JwtManager.verify(token);

    // Assert
    expect(payload).toMatchObject({ sub: 'user-1', email: 'user@example.com', tenantId: 't-1' });
    expect(protectedHeader.alg).toBe(ALG);
    expect(mockApi.loadPublicKey).not.toHaveBeenCalled();
  });

  it('rejects a token signed by a different key', async () => {
    mockConfig.jwtPublicKeyJson = JSON.stringify(publicJwk);
    const JwtManager = await loadJwtManager();
    const token = await signToken(otherSigningKey);

    await expect(JwtManager.verify(token)).rejects.toThrow(/signature verification failed/);
  });

  it('rejects an expired token', async () => {
    mockConfig.jwtPublicKeyJson = JSON.stringify(publicJwk);
    const JwtManager = await loadJwtManager();
    const nowSec = Math.floor(Date.now() / 1000);
    const token = await signToken(signingKey, {}, nowSec - 60);

    await expect(JwtManager.verify(token)).rejects.toThrow(/"exp" claim timestamp check failed/);
  });

  it('rejects a malformed token', async () => {
    mockConfig.jwtPublicKeyJson = JSON.stringify(publicJwk);
    const JwtManager = await loadJwtManager();

    await expect(JwtManager.verify('not-a-jwt')).rejects.toThrow('Invalid Compact JWS');
  });

  it('caches the imported public key across verify calls', async () => {
    // Arrange
    mockConfig.jwtPublicKeyJson = JSON.stringify(publicJwk);
    const JwtManager = await loadJwtManager();
    await JwtManager.verify(await signToken(signingKey));
    mockConfig.jwtPublicKeyJson = JSON.stringify(otherPublicJwk);

    // Act
    const result = await JwtManager.verify(await signToken(signingKey));

    // Assert: the first key is still used even though config changed
    expect(result.payload.sub).toBe('user-1');
    await expect(JwtManager.verify(await signToken(otherSigningKey))).rejects.toThrow();
  });
});

describe('JwtManager.verify with JWKS fallback', () => {
  it('loads the public key from frontegg jwks when the env value is not valid JSON', async () => {
    // Arrange
    mockConfig.jwtPublicKeyJson = '{not json';
    mockApi.loadPublicKey.mockResolvedValue(publicJwk);
    const JwtManager = await loadJwtManager();

    // Act
    const { payload } = await JwtManager.verify(await signToken(signingKey));

    // Assert
    expect(payload.sub).toBe('user-1');
    expect(mockApi.loadPublicKey).toHaveBeenCalledTimes(1);
  });

  it('fetches the jwks only once and reuses the cached key afterwards', async () => {
    mockConfig.jwtPublicKeyJson = '{not json';
    mockApi.loadPublicKey.mockResolvedValue(publicJwk);
    const JwtManager = await loadJwtManager();

    await JwtManager.verify(await signToken(signingKey));
    await JwtManager.verify(await signToken(signingKey));

    expect(mockApi.loadPublicKey).toHaveBeenCalledTimes(1);
  });

  it('propagates jwks loading failures and retries on the next call', async () => {
    // Arrange
    mockConfig.jwtPublicKeyJson = '{not json';
    mockApi.loadPublicKey.mockRejectedValueOnce(new Error('jwks unavailable')).mockResolvedValueOnce(publicJwk);
    const JwtManager = await loadJwtManager();
    const token = await signToken(signingKey);

    // Act + Assert
    await expect(JwtManager.verify(token)).rejects.toThrow('jwks unavailable');
    await expect(JwtManager.verify(token)).resolves.toMatchObject({ payload: { sub: 'user-1' } });
    expect(mockApi.loadPublicKey).toHaveBeenCalledTimes(2);
  });

  it('works end-to-end with the real api.loadPublicKey and a mocked fetch', async () => {
    // Arrange
    mockConfig.jwtPublicKeyJson = '{not json';
    const actualApi = await vi.importActual<typeof import('../../../../src/api')>('../../../../src/api');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ keys: [publicJwk] })));
    vi.stubGlobal('fetch', fetchMock);
    Object.assign(mockConfig, { baseUrl: 'https://auth.example.com' });
    mockApi.loadPublicKey.mockImplementation(actualApi.default.loadPublicKey);
    const JwtManager = await loadJwtManager();

    try {
      // Act
      const { payload } = await JwtManager.verify(await signToken(signingKey));

      // Assert
      expect(payload.sub).toBe('user-1');
      expect(fetchMock).toHaveBeenCalledWith('https://auth.example.com/.well-known/jwks.json', {
        cache: 'force-cache',
      });
    } finally {
      vi.unstubAllGlobals();
      delete (mockConfig as { baseUrl?: string }).baseUrl;
    }
  });

  /**
   * When FRONTEGG_JWT_PUBLIC_KEY is unset, the real `config.jwtPublicKeyJson` getter throws
   * (getEnv raises FronteggEnvNotFound) inside the same try block, which routes to the JWKS fallback.
   */
  it('loads the public key from frontegg jwks when FRONTEGG_JWT_PUBLIC_KEY is unset', async () => {
    // Arrange
    Object.defineProperty(mockConfig, 'jwtPublicKeyJson', {
      configurable: true,
      get: () => {
        throw new Error('FRONTEGG_JWT_PUBLIC_KEY environment variable not found');
      },
    });
    mockApi.loadPublicKey.mockResolvedValue(publicJwk);
    const JwtManager = await loadJwtManager();

    try {
      // Act
      const { payload } = await JwtManager.verify(await signToken(signingKey));

      // Assert
      expect(payload.sub).toBe('user-1');
      expect(mockApi.loadPublicKey).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(mockConfig, 'jwtPublicKeyJson', { configurable: true, writable: true, value: undefined });
    }
  });
});
