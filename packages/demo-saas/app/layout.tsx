import { FronteggAppProvider } from '@frontegg/nextjs/server';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head></head>
      <body>
        {/* @ts-expect-error Server Component for more details visit: https://github.com/vercel/next.js/issues/42292 */}
        <FronteggAppProvider authOptions={{ keepSessionAlive: true }}>{children}</FronteggAppProvider>
      </body>
    </html>
  );
}

// 1) middleware.ts httpCall => session =>  NextResponse.next()
// 2) page.tsx render
// 3) layout.tsx render
// 4) hooks in `use client` files;
