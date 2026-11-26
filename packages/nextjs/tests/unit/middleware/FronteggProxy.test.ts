// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';

const proxyServer = vi.hoisted(() => ({ on: vi.fn(), web: vi.fn() }));

vi.mock('http-proxy', () => ({ createProxyServer: vi.fn(() => proxyServer) }));
vi.mock('../../../src/middleware/ProxyRequestCallback', () => ({ default: vi.fn() }));
vi.mock('../../../src/middleware/ProxyResponseCallback', () => ({ default: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('FronteggProxy', () => {
  it('creates a self handled, origin changing proxy and wires the request and response callbacks', async () => {
    // Arrange
    vi.stubEnv('FRONTEGG_BASE_URL', 'https://auth.example.com');
    const { createProxyServer } = (await import('http-proxy')) as any;
    const { default: ProxyRequestCallback } = await import('../../../src/middleware/ProxyRequestCallback');
    const { default: ProxyResponseCallback } = await import('../../../src/middleware/ProxyResponseCallback');
    // the global setup clears mock calls before each test, so record what happened during module import
    const createCalls: any[] = [];
    const onCalls: any[] = [];
    vi.mocked(createProxyServer).mockImplementation(((options: any) => {
      createCalls.push(options);
      return proxyServer;
    }) as any);
    proxyServer.on.mockImplementation((...args: any[]) => onCalls.push(args));

    // Act
    const { FronteggProxy } = await import('../../../src/middleware/FronteggProxy');

    // Assert
    expect(FronteggProxy).toBe(proxyServer);
    expect(createCalls).toEqual([
      { target: 'https://auth.example.com', changeOrigin: true, selfHandleResponse: true, xfwd: true },
    ]);
    expect(onCalls).toEqual([
      ['proxyReq', ProxyRequestCallback],
      ['proxyRes', ProxyResponseCallback],
    ]);
  });
});
