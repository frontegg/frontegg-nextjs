import { FronteggAppProvider } from '@frontegg/nextjs/app';

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
