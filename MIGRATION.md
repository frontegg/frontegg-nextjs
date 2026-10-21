# Client IP forwarding after 9.2.14

With `FRONTEGG_FORWARD_IP='true'`, the SDK now forwards the client IP only from a source it can trust. The API middleware, token refresh, the hosted login code exchange and the server-side user data requests resolve it in this order:

1. In the API middleware only, `ipResolver` passed to `FronteggApiMiddleware.withOptions`.
2. Otherwise the rightmost value of the header named in `FRONTEGG_CLIENT_IP_HEADER`, when set.
3. Otherwise, on Vercel, the `x-forwarded-for` that Vercel sets. When that address belongs to Cloudflare, `cf-connecting-ip` is used instead, and nothing is forwarded if it is missing or not an IP address.
4. Otherwise nothing is forwarded.

The middleware reads the client IP from the request headers as they arrived, before its proxy appends the socket address to `x-forwarded-for`.

### `ipResolver`

`ipResolver` applies to the API middleware only, as in 9.2.14. Token refresh, the hosted login code exchange, the server-side user data requests and every Edge runtime path never call it. Each of them uses `FRONTEGG_CLIENT_IP_HEADER` or, on Vercel, the Vercel header. Set `FRONTEGG_CLIENT_IP_HEADER` when you need the client IP on those paths too.

- It receives the real `NextApiRequest`, so it can read `req.socket` or `req.url`.
- When it returns a comma-separated list, for example `req.headers['x-forwarded-for']`, the first entry is used.
- When it returns anything other than a string, such as a header array, or when it throws, nothing is forwarded and the request is still proxied.

Values that are not IP addresses are dropped, and so are the unspecified addresses `0.0.0.0` and `::` and IPv4 octets with leading zeros (`010.1.1.1`). Ports and brackets are removed, IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4` or `::ffff:102:304`) are sent as IPv4, and IPv6 addresses are sent in their compressed lowercase form.

The middleware no longer passes `x-frontegg-forwarded-for`, `x-frontegg-headers-verifier` or `frontegg-vendor-id` sent with the request to Frontegg. It sets them itself when it resolves a client IP.

### Action required when not on Vercel

The SDK no longer reads `x-frontegg-forwarded-for`, `x-real-ip`, `x-vercel-proxied-for`, `cf-connecting-ip` or `x-forwarded-for` sent with the request, or the socket address. Until a source is configured, IP rules (allowlists, rate limits, lockouts) stop applying to refresh, profile, tenant and entitlement requests. Configure the header your own proxy sets with the client IP, for example:

```
# nginx with proxy_set_header X-Real-IP $remote_addr
FRONTEGG_CLIENT_IP_HEADER='x-real-ip'

# Cloudflare in front of the application
FRONTEGG_CLIENT_IP_HEADER='cf-connecting-ip'

# One load balancer that appends the client IP to x-forwarded-for
FRONTEGG_CLIENT_IP_HEADER='x-forwarded-for'
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
