# Client IP forwarding after 9.2.14

With `FRONTEGG_FORWARD_IP='true'`, the SDK now forwards the client IP only from a source it can trust. The same rule applies to the API middleware, token refresh, the hosted login code exchange and the server-side user data requests:

1. `ipResolver` passed to `FronteggApiMiddleware.withOptions`, when set.
2. Otherwise the rightmost value of the header named in `FRONTEGG_FORWARD_IP_HEADER`, when set.
3. Otherwise, on Vercel, the `x-forwarded-for` that Vercel sets, or `cf-connecting-ip` when that address belongs to Cloudflare.
4. Otherwise nothing is forwarded.

The middleware registers `ipResolver`, so the other paths use it only after the middleware has handled a request in the same server process. Prefer `FRONTEGG_FORWARD_IP_HEADER` when it covers your setup.

Values that are not IP addresses are dropped. Ports and brackets are removed, and IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) are sent as IPv4.

### Action required when not on Vercel

The SDK no longer reads `x-frontegg-forwarded-for`, `x-real-ip`, `x-vercel-proxied-for`, `cf-connecting-ip` or `x-forwarded-for` sent with the request, or the socket address. Until a source is configured, IP rules (allowlists, rate limits, lockouts) stop applying to refresh, profile, tenant and entitlement requests. Configure the header your own proxy sets with the client IP, for example:

```
# nginx with proxy_set_header X-Real-IP $remote_addr
FRONTEGG_FORWARD_IP_HEADER='x-real-ip'

# Cloudflare in front of the application
FRONTEGG_FORWARD_IP_HEADER='cf-connecting-ip'

# One load balancer that appends the client IP to x-forwarded-for
FRONTEGG_FORWARD_IP_HEADER='x-forwarded-for'
```

Only set it when every request reaches the application through that proxy, otherwise callers can send the header themselves.

# Migrate from v6 to v7

### Using Next.JS pages architecture:

- Rename imports from `@frontegg/nextjs` to `@frontegg/nextjs/pages`

### Using Next.JS edge runtime

- Rename imports from `@frontegg/nextjs` to `@frontegg/nextjs/edge`

### Using Next.JS 13 with app directory architecture:

- Server Side components should be imported from `@frontegg/nextjs/server`
- Client Side components should be imported from `@frontegg/nextjs/client`
