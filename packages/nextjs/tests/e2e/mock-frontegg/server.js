/** Local stand-in for Frontegg for the flow E2E suite; control API: GET /__mock/requests, POST /__mock/reset, POST /__mock/config. */
const http = require('http');
const path = require('path');
const { URL } = require('url');
const { SignJWT, importJWK } = require('jose');

const FIXTURES_DIR = path.join(__dirname, '../mocked/fixtures');
const TEST_PUBLIC_JWK = require(path.join(FIXTURES_DIR, 'test-public-jwk.json'));
const TEST_PRIVATE_JWK = require(path.join(FIXTURES_DIR, 'test-private-jwk.json'));

const PORT = Number(process.env.MOCK_FRONTEGG_PORT || 4010);
const CLIENT_ID = process.env.FRONTEGG_CLIENT_ID || '';
const KEY_ID = 'e2e-test-key';
const DEFAULT_CONFIG = Object.freeze({
  failRefresh: false,
  refreshFailureStatus: 401,
  accessTokenTtlSeconds: 3600,
  claimsPaddingLength: 0,
});
const MOCK_USER = Object.freeze({
  sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  email: 'mock-user@example.com',
  name: 'Mock User',
  tenantId: 'tenant-mock',
  roles: ['Admin'],
  permissions: ['read', 'write'],
});

let mockConfig = { ...DEFAULT_CONFIG };
let requestLog = [];
let issuedTokenCount = 0;
let privateKeyPromise;

function refreshCookieName() {
  return `fe_refresh_${CLIENT_ID.replace(/-/g, '')}`;
}

function parseCookies(header) {
  return (header || '')
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .reduce((cookies, pair) => {
      const separatorIndex = pair.indexOf('=');
      const name = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
      const value = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1);
      return { ...cookies, [name]: value };
    }, {});
}

function findRefreshToken(cookies) {
  const expected = refreshCookieName();
  const name = Object.keys(cookies).find((cookie) => cookie.replace(/-/g, '') === expected);
  return name ? cookies[name] : undefined;
}

async function signAccessToken() {
  privateKeyPromise = privateKeyPromise || importJWK(TEST_PRIVATE_JWK, 'RS256');
  const privateKey = await privateKeyPromise;
  const claims = mockConfig.claimsPaddingLength > 0 ? { padding: 'x'.repeat(mockConfig.claimsPaddingLength) } : {};
  return new SignJWT({ ...MOCK_USER, ...claims, iss: 'frontegg-mock', aud: CLIENT_ID })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: KEY_ID })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + mockConfig.accessTokenTtlSeconds)
    .sign(privateKey);
}

async function issueTokens() {
  issuedTokenCount += 1;
  const accessToken = await signAccessToken();
  const refreshToken = `mock-refresh-token-${issuedTokenCount}`;
  return { accessToken, refreshToken, expiresIn: mockConfig.accessTokenTtlSeconds };
}

function refreshSetCookie(refreshToken) {
  return `${refreshCookieName()}=${refreshToken}; Path=/; HttpOnly; SameSite=Lax`;
}

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  // Like the real service, send an explicit length rather than chunked encoding.
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {};
  }
}

async function handleEmbeddedRefresh(req, res) {
  const refreshToken = findRefreshToken(parseCookies(req.headers.cookie));
  if (mockConfig.failRefresh) {
    return sendJson(res, mockConfig.refreshFailureStatus, { errors: ['Refresh failed'] });
  }
  if (!refreshToken) {
    return sendJson(res, 401, { errors: ['Session expired'] });
  }
  const tokens = await issueTokens();
  return sendJson(res, 200, tokens, { 'set-cookie': refreshSetCookie(tokens.refreshToken) });
}

async function handleOAuthToken(res, body) {
  const hasGrant =
    (body.grant_type === 'authorization_code' && body.code) ||
    (body.grant_type === 'refresh_token' && body.refresh_token);
  if (!hasGrant || mockConfig.failRefresh) {
    return sendJson(res, 401, { error: 'invalid_grant' });
  }
  const tokens = await issueTokens();
  return sendJson(
    res,
    200,
    {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      token_type: 'Bearer',
    },
    { 'set-cookie': refreshSetCookie(tokens.refreshToken) }
  );
}

function handleAuthorize(res, url) {
  const redirectUri = url.searchParams.get('redirect_uri');
  if (!redirectUri) {
    return sendJson(res, 400, { error: 'missing redirect_uri' });
  }
  const target = new URL(redirectUri);
  target.searchParams.set('code', 'mock-authorization-code');
  const state = url.searchParams.get('state');
  if (state) {
    target.searchParams.set('state', state);
  }
  res.writeHead(302, { location: target.toString() });
  return res.end();
}

function handleLogout(res, url) {
  const redirectUri = url.searchParams.get('post_logout_redirect_uri') || '/';
  res.writeHead(302, {
    location: redirectUri,
    'set-cookie': `${refreshCookieName()}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  });
  return res.end();
}

const ROUTES = [
  ['GET', '/.well-known/jwks.json', (req, res) => sendJson(res, 200, { keys: [{ ...TEST_PUBLIC_JWK, kid: KEY_ID }] })],
  ['POST', '/frontegg/identity/resources/auth/v1/user/token/refresh', (req, res) => handleEmbeddedRefresh(req, res)],
  ['POST', '/frontegg/oauth/token', (req, res, url, body) => handleOAuthToken(res, parseJson(body))],
  ['GET', '/oauth/authorize', (req, res, url) => handleAuthorize(res, url)],
  ['GET', '/frontegg/oauth/authorize', (req, res, url) => handleAuthorize(res, url)],
  ['GET', '/oauth/logout', (req, res, url) => handleLogout(res, url)],
  ['GET', '/frontegg/oauth/logout', (req, res, url) => handleLogout(res, url)],
  [
    'GET',
    '/frontegg/identity/resources/users/v2/me',
    (req, res) => sendJson(res, 200, { id: MOCK_USER.sub, email: MOCK_USER.email, name: MOCK_USER.name }),
  ],
  [
    'GET',
    '/frontegg/identity/resources/users/v3/me/tenants',
    (req, res) => sendJson(res, 200, { activeTenant: { tenantId: MOCK_USER.tenantId }, tenants: [] }),
  ],
  [
    'GET',
    '/frontegg/identity/resources/users/v1/me/authorization',
    (req, res) => sendJson(res, 200, { roles: [], permissions: [] }),
  ],
  ['GET', '/frontegg/entitlements/api/v2/user-entitlements', (req, res) => sendJson(res, 200, { features: {} })],
];

async function handleControl(req, res, url, body) {
  if (url.pathname === '/__mock/requests') {
    return sendJson(res, 200, requestLog);
  }
  if (url.pathname === '/__mock/reset' && req.method === 'POST') {
    requestLog = [];
    mockConfig = { ...DEFAULT_CONFIG };
    return sendJson(res, 200, { ok: true });
  }
  if (url.pathname === '/__mock/config' && req.method === 'POST') {
    mockConfig = { ...mockConfig, ...parseJson(body) };
    return sendJson(res, 200, mockConfig);
  }
  return sendJson(res, 404, { error: 'unknown control endpoint' });
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const body = await readBody(req);

  if (url.pathname.startsWith('/__mock/')) {
    return handleControl(req, res, url, body);
  }

  requestLog = [
    ...requestLog,
    { method: req.method, path: url.pathname, query: url.search, headers: req.headers, body, at: Date.now() },
  ];

  const route = ROUTES.find(([method, routePath]) => method === req.method && routePath === url.pathname);
  if (route) {
    return route[2](req, res, url, body);
  }
  // Anything else (e.g. calls from the browser-side Frontegg client) gets an empty success so pages still render.
  return sendJson(res, 200, {});
}

http
  .createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      console.error('[mock-frontegg] request failed', error);
      sendJson(res, 500, { error: String(error) });
    });
  })
  .listen(PORT, () => {
    console.log(`[mock-frontegg] listening on http://localhost:${PORT}`);
  });
